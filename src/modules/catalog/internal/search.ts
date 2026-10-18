import { db } from "@/lib/db";

import { clampInt, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./list";
import { loadSummaries, type ProductSummary } from "./products";
import { createPostgresSearchIndex } from "./search/postgres-search-index";
import type { SearchIndex } from "./search/search-index";

const index: SearchIndex = createPostgresSearchIndex();

export type SearchResult = {
  items: ProductSummary[];
  total: number;
  /** Set when a typo was corrected, for "Showing results for ...". */
  correctedQuery: string | null;
};

export type SearchSuggestions = {
  products: ProductSummary[];
  brands: string[];
  categories: { slug: string; name: string }[];
};

const SUGGESTED_PRODUCTS = 5;

export async function searchProducts(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<SearchResult> {
  const limit = clampInt(options.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(options.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const found = await index.search(query, { limit, offset });
  return {
    items: await loadSummaries(found.ids),
    total: found.total,
    correctedQuery: found.correctedQuery,
  };
}

export async function suggestSearch(query: string): Promise<SearchSuggestions> {
  const found = await index.suggest(query, SUGGESTED_PRODUCTS);
  const [products, categories] = await Promise.all([
    loadSummaries(found.productIds),
    found.categoryIds.length
      ? db.category.findMany({
          where: { id: { in: found.categoryIds } },
          select: { id: true, slug: true, name: true },
        })
      : [],
  ]);
  const byId = new Map(
    categories.map((c) => [c.id, { slug: c.slug, name: c.name }])
  );
  return {
    products,
    brands: found.brands,
    categories: found.categoryIds.flatMap((id) => byId.get(id) ?? []),
  };
}
