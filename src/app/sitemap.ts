import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import {
  articleList,
  CATALOG_TAG,
  CONTENT_TAG,
  recipeList,
} from "@/app/_data/storefront";
import { listSitemapEntries } from "@/modules/catalog";
import { categoryHref, productHref } from "@/lib/routes";

// shortcut: one sitemap file; split with generateSitemaps past 50,000 URLs.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG, CONTENT_TAG);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [{ products, categories }, recipes, articles] = await Promise.all([
    listSitemapEntries(),
    recipeList(),
    articleList(),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...categories.map((c) => ({
      url: `${base}${categoryHref(c.path)}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}${productHref(p)}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: `${base}/recipes`, changeFrequency: "weekly", priority: 0.7 },
    ...recipes.map((r) => ({
      url: `${base}/recipes/${r.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${base}/articles`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/help`, changeFrequency: "monthly", priority: 0.3 },
    ...["/privacy", "/terms", "/refunds", "/business-info"].map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
    ...articles.map((a) => ({
      url: `${base}/articles/${a.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
