import { db } from "@/lib/db";

/** Everything search engines should crawl: active Products and every Category. */
export async function listSitemapEntries() {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { status: "active" },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { slug: "asc" },
    }),
    db.category.findMany({
      select: { id: true, parentId: true, slug: true, updatedAt: true },
    }),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const pathOf = (id: string) => {
    const path: string[] = [];
    const seen = new Set<string>();
    for (
      let c = byId.get(id);
      c && !seen.has(c.id);
      c = c.parentId ? byId.get(c.parentId) : undefined
    ) {
      seen.add(c.id);
      path.unshift(c.slug);
    }
    return path;
  };
  return {
    products,
    categories: categories.map((c) => ({
      path: pathOf(c.id),
      updatedAt: c.updatedAt,
    })),
  };
}
