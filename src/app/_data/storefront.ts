// Cached storefront reads. Pages call these, not the modules directly, so
// caching lives in one place. Tags let admin edits refresh the shop
// (Batch 1.5); the "minutes" profile refreshes within a minute regardless.
import { cacheLife, cacheTag } from "next/cache";

import {
  getCategory,
  getCategoryTree,
  getProduct,
  listProducts,
  listRelatedProducts,
  searchProducts,
  suggestSearch,
  type CategoryNode,
  type ListProductsInput,
} from "@/modules/catalog";
import { getDefaultHubId } from "@/modules/delivery";
import { getStockStates } from "@/modules/inventory";

export const CATALOG_TAG = "catalog";
export const STOCK_TAG = "stock";

function catalogCache() {
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
}

export async function categoryTree(): Promise<CategoryNode[]> {
  "use cache";
  catalogCache();
  return getCategoryTree();
}

export async function category(slug: string) {
  "use cache";
  catalogCache();
  return getCategory(slug);
}

export async function productList(input: ListProductsInput) {
  "use cache";
  catalogCache();
  return listProducts(input);
}

export async function product(id: string) {
  "use cache";
  catalogCache();
  return getProduct(id);
}

export async function relatedProducts(id: string, limit: number) {
  "use cache";
  catalogCache();
  return listRelatedProducts(id, limit);
}

export async function productSearch(
  query: string,
  page: { limit: number; offset: number }
) {
  "use cache";
  catalogCache();
  return searchProducts(query, page);
}

export async function searchSuggestions(query: string) {
  "use cache";
  catalogCache();
  return suggestSearch(query);
}

export async function stockStates(productIds: string[]) {
  "use cache";
  cacheLife("minutes");
  cacheTag(STOCK_TAG);
  const hubId = await getDefaultHubId();
  // No Hub yet means nothing can be delivered: show everything as out.
  if (!hubId)
    return Object.fromEntries(productIds.map((id) => [id, "out" as const]));
  return getStockStates(productIds, hubId);
}

/** Root-to-node slug path for every Category, for building /c/ links. */
export function categoryPaths(tree: CategoryNode[]): Map<string, string[]> {
  const paths = new Map<string, string[]>();
  const walk = (nodes: CategoryNode[], prefix: string[]) => {
    for (const n of nodes) {
      const path = [...prefix, n.slug];
      paths.set(n.slug, path);
      walk(n.children, path);
    }
  };
  walk(tree, []);
  return paths;
}
