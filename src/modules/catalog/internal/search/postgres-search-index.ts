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
 * name, and the parent's name unless the parent joins two topics
 * ("Meat and fish") and one of its children already matches the query.
 * So "fish" means the Fish and seafood aisle, not every pork chop, while
 * "meat" and "frozen chicken" still work.
 */
function matches(query: string, exact: string) {
  return Prisma.sql`
    WITH q AS (
      SELECT to_tsquery('simple', ${query}) AS query,
             to_tsquery('simple', ${exact}) AS exact
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
               WHEN par.joins_topics AND EXISTS (
                 SELECT 1 FROM cat ch CROSS JOIN q
                 WHERE ch.parent_id = par.id AND ch.v @@ q.query
               ) THEN ''::tsvector
               ELSE par.v
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
      WHERE p.status = 'active' AND (p.search_vector || lent.v) @@ q.query
    )`;
}

async function run(terms: string[], limit: number, offset: number) {
  const cte = matches(
    toTsQuery(terms, { prefix: true }),
    toTsQuery(terms, { prefix: false })
  );
  const [rows, counted] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      ${cte}
      SELECT id FROM matched
      ORDER BY whole_word DESC, own_words DESC, own_category DESC, rank DESC, name ASC, id ASC
      LIMIT ${limit} OFFSET ${offset}`,
    db.$queryRaw<{ total: number }[]>`
      ${cte}
      SELECT count(*)::int AS total FROM matched`,
  ]);
  return { ids: rows.map((r) => r.id), total: counted[0]?.total ?? 0 };
}

/**
 * Last resort for part of a word ("kong") or a near brand: pg_trgm word
 * similarity (`<%`, threshold pg_trgm.word_similarity_threshold, 0.6 by
 * default). Every word must match, so one good word cannot carry junk.
 */
async function runTrigram(terms: string[], limit: number, offset: number) {
  const words = terms.filter((t) => t.length >= MIN_TRIGRAM_TERM);
  if (words.length === 0 || words.length !== terms.length) return EMPTY;
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

      // Nothing matched. 1: the closest known word for up to 3 terms.
      const vocabulary = await loadVocabulary();
      const corrected = terms.map((t, i) =>
        i < MAX_CORRECTED_TERMS ? correctTerm(t, vocabulary) : t
      );
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
        db.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM products p CROSS JOIN ${q}
          WHERE p.status = 'active' AND p.search_vector @@ q.query
          ORDER BY p.search_vector @@ q.exact DESC,
                   ts_rank_cd(p.search_vector, q.query) DESC, p.name ASC
          LIMIT ${limit}`,
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
