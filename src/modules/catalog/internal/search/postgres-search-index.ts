import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import {
  correctTerm,
  normalizeTerms,
  SYNONYM_WORDS,
  toTsQuery,
} from "./normalize";
import type { SearchIndex } from "./search-index";

const EMPTY = { ids: [], total: 0, correctedQuery: null };

// A Product matches on its own words (search_vector: name, brand,
// description) or because its Category or parent Category matches.
const MATCH = Prisma.sql`(
  p.search_vector @@ q.query
  OR to_tsvector('simple', immutable_unaccent(c.name)) @@ q.query
  OR (pc.name IS NOT NULL AND to_tsvector('simple', immutable_unaccent(pc.name)) @@ q.query)
)`;

async function run(terms: string[], limit: number, offset: number) {
  const tsquery = toTsQuery(terms);
  const from = Prisma.sql`
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories pc ON pc.id = c.parent_id
    CROSS JOIN (SELECT to_tsquery('simple', ${tsquery}) AS query) q
    WHERE p.status = 'active' AND ${MATCH}`;
  const [rows, counted] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT p.id ${from}
      ORDER BY ts_rank_cd(p.search_vector, q.query) DESC, p.name ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}`,
    db.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${from}`,
  ]);
  return { ids: rows.map((r) => r.id), total: counted[0]?.total ?? 0 };
}

/**
 * Trigram word similarity against Product names (`<%` uses
 * pg_trgm.word_similarity_threshold, 0.6 by default, and the trigram index).
 */
async function runTrigram(text: string, limit: number, offset: number) {
  const from = Prisma.sql`
    FROM products p
    WHERE p.status = 'active' AND ${text} <% p.name`;
  const [rows, counted] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT p.id ${from}
      ORDER BY word_similarity(${text}, p.name) DESC, p.name ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}`,
    db.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${from}`,
  ]);
  return { ids: rows.map((r) => r.id), total: counted[0]?.total ?? 0 };
}

/** Words in active Products and Category names, with how many Products use each. */
async function loadVocabulary(): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ word: string; ndoc: number }[]>`
    SELECT word, ndoc::int FROM ts_stat($q$
      SELECT search_vector FROM products WHERE status = 'active'
      UNION ALL
      SELECT to_tsvector('simple', immutable_unaccent(name)) FROM categories
    $q$)`;
  const vocabulary = new Map(rows.map((r) => [r.word, r.ndoc]));
  for (const word of SYNONYM_WORDS) {
    if (!vocabulary.has(word)) vocabulary.set(word, 0);
  }
  return vocabulary;
}

export function createPostgresSearchIndex(): SearchIndex {
  return {
    async search(query, { limit, offset }) {
      const terms = normalizeTerms(query);
      if (terms.length === 0) return EMPTY;

      const found = await run(terms, limit, offset);
      if (found.total > 0) return { ...found, correctedQuery: null };

      // Nothing matched: try the closest known word for each term, once.
      const vocabulary = await loadVocabulary();
      const corrected = terms.map((t) => correctTerm(t, vocabulary));
      if (corrected.some((t, i) => t !== terms[i])) {
        const retried = await run(corrected, limit, offset);
        if (retried.total > 0) {
          return { ...retried, correctedQuery: corrected.join(" ") };
        }
      }

      // Still nothing: part of a word ("kong") or words typed together.
      const fuzzy = await runTrigram(terms.join(" "), limit, offset);
      return fuzzy.total > 0 ? { ...fuzzy, correctedQuery: null } : EMPTY;
    },

    async suggest(query, limit) {
      const terms = normalizeTerms(query);
      if (terms.length === 0) {
        return { productIds: [], brands: [], categoryIds: [] };
      }
      const q = Prisma.sql`(SELECT to_tsquery('simple', ${toTsQuery(terms)}) AS query) q`;

      const [products, brands, categories] = await Promise.all([
        db.$queryRaw<{ id: string }[]>`
          SELECT p.id FROM products p CROSS JOIN ${q}
          WHERE p.status = 'active' AND p.search_vector @@ q.query
          ORDER BY ts_rank_cd(p.search_vector, q.query) DESC, p.name ASC
          LIMIT ${limit}`,
        db.$queryRaw<{ brand: string }[]>`
          SELECT p.brand FROM products p CROSS JOIN ${q}
          WHERE p.status = 'active' AND p.brand IS NOT NULL
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
