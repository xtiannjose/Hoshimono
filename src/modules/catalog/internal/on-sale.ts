import { db } from "@/lib/db";
import { activePromotions } from "@/modules/pricing";

import { loadSummaries, type ProductSummary } from "./products";

/** Products a running Promotion covers, for "On sale this week" (ADR 0015). */
export async function listPromotedProducts(
  limit: number
): Promise<ProductSummary[]> {
  const promotions = await activePromotions();
  const productIds = promotions.flatMap((p) => p.productIds);
  const categoryIds = promotions.flatMap((p) => p.categoryIds);
  if (productIds.length + categoryIds.length === 0) return [];
  const rows = await db.product.findMany({
    where: {
      status: "active",
      OR: [
        { id: { in: productIds } },
        { categoryId: { in: categoryIds } },
        { category: { parentId: { in: categoryIds } } },
      ],
    },
    orderBy: { name: "asc" },
    take: limit,
    select: { id: true },
  });
  return (await loadSummaries(rows.map((r) => r.id))).filter(
    (p) => p.promotion !== null
  );
}
