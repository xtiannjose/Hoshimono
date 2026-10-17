import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { correctTerm, searchTerms, toTsQuery } from "./normalize";
import type { SearchIndex } from "./search-index";
import { SYNONYM_GROUPS } from "./synonyms";

const EMPTY = { ids: [], total: 0, correctedQuery: null };
const MAX_CORRECTED_TERMS = 3;
const MIN_TRIGRAM_TERM = 3;
const VOCABULARY_TTL_MS = 10 * 60 * 1000;

/**
 * Active Products matching `query`, with the facts used to rank them.
 * A Product is matched on its own words (search_vector: name, brand,
 * description) plus the words its Category lends it: the Category's own
 * name, and its parent's name. A parent that joins two topics
 * ("Meat and fish") lends only the topic none of its children owns:
 * Pork, Chicken and Beef get "meat"; Fish and seafood gets nothing more.
 * So "fish" and "fresh fish" mean the fish aisle, not chicken, while
 * "meat", "dairy" and "frozen chicken" still work.
 */
function matches(query: string, exact: string, any: string) {
  return Prisma.sql`
    WITH q AS (
      SELECT to_tsquery('simple', ${query}) AS query,
             to_tsquery('simple', ${exact}) AS exact,
             to_tsquery('simple', ${any}) AS any
    ),
    cat AS (
      SELECT c.id, c.parent_id,
             to_tsvector('simple', immutable_unaccent(c.name)) AS v,
             lower(c.name) LIKE '% and %' AS joins_topics
      FROM categories c
    ),
    lent AS (
      SELECT c.id, c.v AS own,
             c.v || CASE
               WHEN par.id IS NULL THEN ''::tsvector
               WHEN NOT par.joins_topics THEN par.v
               -- This child is one of the parent's topics: nothing more.
               WHEN tsvector_to_array(c.v) && tsvector_to_array(ts_delete(par.v, ARRAY['and']))
                 THEN ''::tsvector
               -- Otherwise only the parent's words no sibling owns.
               ELSE ts_delete(par.v, ARRAY['and'] || coalesce((
                 SELECT array_agg(w) FROM cat ch, unnest(tsvector_to_array(ch.v)) AS w
                 WHERE ch.parent_id = par.id
               ), '{}'))
             END AS v
      FROM cat c LEFT JOIN cat par ON par.id = c.parent_id
    ),
    matched AS (
      SELECT p.id, p.name,
             p.search_vector @@ q.exact AS whole_word,
             p.search_vector @@ q.query AS own_words,
             lent.own @@ q.query AS own_category,
             ts_rank_cd(p.search_vector || lent.v, q.query) AS rank
      FROM products p
      JOIN lent ON lent.id = p.category_id
      CROSS JOIN q
      WHERE p.status = 'active'
        -- Candidates first: one word hits the Product (GIN index) or its Category.
        AND (p.search_vector @@ q.any
             OR p.category_id IN (SELECT l.id FROM lent l WHERE l.v @@ q.any))
        AND (p.search_vector || lent.v) @@ q.query
    )`;
}

const RANKED = Prisma.sql`whole_word DESC, own_words DESC, own_category DESC, rank DESC, name ASC, id ASC`;

function matchesFor(terms: string[]) {
  return matches(
    toTsQuery(terms, { prefix: true }),
    toTsQuery(terms, { prefix: false }),
    toTsQuery(terms, { prefix: true, any: true })
  );
}

async function run(terms: string[], limit: number, offset: number) {
  const cte = matchesFor(terms);
  // One pass returns the page and the total; only a page past the end
  // (no rows, so no window total) needs a separate count.
  const rows = await db.$queryRaw<{ id: string; total: number }[]>`
    ${cte}
    SELECT id, count(*) OVER ()::int AS total FROM matched
    ORDER BY ${RANKED}
    LIMIT ${limit} OFFSET ${offset}`;
  if (rows.length > 0 || offset === 0) {
    return { ids: rows.map((r) => r.id), total: rows[0]?.total ?? 0 };
  }
  const counted = await db.$queryRaw<{ total: number }[]>`
    ${cte}
    SELECT count(*)::int AS total FROM matched`;
  return { ids: [], total: counted[0]?.total ?? 0 };
}

/**
 * Last resort for part of a word ("kong") or a near brand: pg_trgm word
 * similarity (`<%`, threshold pg_trgm.word_similarity_threshold, 0.6 by
 * default). Every word of 3 or more letters must match, so one good word
 * cannot carry junk; shorter words carry no trigram signal and are skipped.
 */
async function runTrigram(terms: string[], limit: number, offset: number) {
  const words = terms.filter((t) => t.length >= MIN_TRIGRAM_TERM);
  if (words.length === 0) return EMPTY;
  const text = Prisma.sql`(coalesce(p.brand, '') || ' ' || p.name)`;
  const where = Prisma.join(
    words.map((w) => Prisma.sql`${w} <% ${text}`),
    " AND "
  );
  const score = Prisma.join(
    words.map((w) => Prisma.sql`word_similarity(${w}, ${text})`),
    " + "
  );
  const from = Prisma.sql`FROM products p WHERE p.status = 'active' AND ${where}`;
  const [rows, counted] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT p.id ${from}
      ORDER BY ${score} DESC, p.name ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}`,
    db.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${from}`,
  ]);
  return {
    ids: rows.map((r) => r.id),
    total: counted[0]?.total ?? 0,
    correctedQuery: null,
  };
}

// shortcut: process-local cache; a word added in the last 10 minutes can be
// "corrected" away. Move to a words table refreshed on catalogue edits if
// that matters.
let vocabularyCache: { expires: number; words: Map<string, number> } | null =
  null;

/** Words in active Products and Category names, with how many Products use each. */
async function loadVocabulary(): Promise<Map<string, number>> {
  const now = Date.now();
  if (vocabularyCache && vocabularyCache.expires > now) {
    return vocabularyCache.words;
  }
  const rows = await db.$queryRaw<{ word: string; ndoc: number }[]>`
    SELECT word, ndoc::int FROM ts_stat($q$
      SELECT search_vector FROM products WHERE status = 'active'
      UNION ALL
      SELECT to_tsvector('simple', immutable_unaccent(name)) FROM categories
    $q$)`;
  const words = new Map(rows.map((r) => [r.word, r.ndoc]));
  // A Filipino word counts as often as its English equivalent, so "manko"
  // corrects to manok (chicken) rather than to a rarer English word.
  for (const group of SYNONYM_GROUPS) {
    const members = group.flatMap((m) => m.split(" "));
    const uses = Math.max(...members.map((w) => words.get(w) ?? 0));
    for (const w of members) {
      if ((words.get(w) ?? 0) < uses) words.set(w, uses);
      else if (!words.has(w)) words.set(w, 0);
    }
  }
  vocabularyCache = { expires: now + VOCABULARY_TTL_MS, words };
  return words;
}

export function createPostgresSearchIndex(): SearchIndex {
  return {
    async search(query, { limit, offset }) {
      const terms = searchTerms(query);
      if (terms.length === 0) return EMPTY;

      const found = await run(terms, limit, offset);
      if (found.total > 0) return { ...found, correctedQuery: null };

      // Nothing matched. 1: the closest known word, at most 3 corrections.
      const vocabulary = await loadVocabulary();
      let left = MAX_CORRECTED_TERMS;
      const corrected = terms.map((t) => {
        if (left === 0) return t;
        const c = correctTerm(t, vocabulary);
        if (c !== t) left--;
        return c;
      });
      if (corrected.some((t, i) => t !== terms[i])) {
        const retried = await run(corrected, limit, offset);
        if (retried.total > 0) {
          return { ...retried, correctedQuery: corrected.join(" ") };
        }
      }

      // 2: words typed apart, such as "pan de sal".
      if (terms.length > 1) {
        const joined = await run([terms.join("")], limit, offset);
        if (joined.total > 0) return { ...joined, correctedQuery: null };
      }

      // 3: part of a word or a near spelling, every word required.
      return runTrigram(terms, limit, offset);
    },

    async suggest(query, limit) {
      const terms = searchTerms(query);
      if (terms.length === 0) {
        return { productIds: [], brands: [], categoryIds: [] };
      }
      const q = Prisma.sql`(
        SELECT to_tsquery('simple', ${toTsQuery(terms, { prefix: true })}) AS query,
               to_tsquery('simple', ${toTsQuery(terms, { prefix: false })}) AS exact
      ) q`;

      const [products, brands, categories] = await Promise.all([
        // The same match and order as search, so the two never disagree.
        db.$queryRaw<{ id: string }[]>`
          ${matchesFor(terms)}
          SELECT id FROM matched ORDER BY ${RANKED} LIMIT ${limit}`,
        // search_vector already holds the brand, so its index narrows this first.
        db.$queryRaw<{ brand: string }[]>`
          SELECT p.brand FROM products p CROSS JOIN ${q}
          WHERE p.status = 'active' AND p.brand IS NOT NULL
            AND p.search_vector @@ q.query
            AND to_tsvector('simple', immutable_unaccent(p.brand)) @@ q.query
          GROUP BY p.brand
          ORDER BY count(*) DESC, p.brand ASC
          LIMIT 3`,
        db.$queryRaw<{ id: string }[]>`
          SELECT c.id FROM categories c CROSS JOIN ${q}
          WHERE to_tsvector('simple', immutable_unaccent(c.name)) @@ q.query
          ORDER BY c.parent_id IS NULL, c.sort_order, c.name
          LIMIT 3`,
      ]);
      return {
        productIds: products.map((r) => r.id),
        brands: brands.map((r) => r.brand),
        categoryIds: categories.map((r) => r.id),
      };
    },
  };
}
