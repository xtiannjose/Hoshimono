// Cached storefront reads. Pages call these, not the modules directly, so
// caching lives in one place. Tags let admin edits refresh the shop
// (Batch 1.5); the "minutes" profile refreshes within a minute regardless.
import { cacheLife, cacheTag } from "next/cache";

import {
  getCategoryTree,
  listProducts,
  type CategoryNode,
  type ListProductsInput,
} from "@/modules/catalog";
import { getDefaultHubId } from "@/modules/delivery";
import { getStockStates } from "@/modules/inventory";

export const CATALOG_TAG = "catalog";
export const STOCK_TAG = "stock";

export async function categoryTree(): Promise<CategoryNode[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  return getCategoryTree();
}

export async function productList(input: ListProductsInput) {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);
  return listProducts(input);
}

export async function stockStates(productIds: string[]) {
  "use cache";
  cacheLife("minutes");
  cacheTag(STOCK_TAG);
  return getStockStates(productIds, await getDefaultHubId());
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
