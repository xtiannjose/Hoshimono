import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { CATALOG_TAG } from "@/app/_data/storefront";
import { listSitemapEntries } from "@/modules/catalog";
import { categoryHref, productHref } from "@/lib/routes";

// shortcut: one sitemap file; split with generateSitemaps past 50,000 URLs.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { products, categories } = await listSitemapEntries();
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
  ];
}
