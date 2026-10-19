import { db } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

import { loadSummaries, type ProductSummary } from "./products";

/**
 * Products to show under a Product page: the same Category first, then the
 * rest of its parent Category, nearest price first. Never the Product itself.
 * shortcut: no purchase data yet; switch to "often bought together" once
 * Orders exist.
 */
export async function listRelatedProducts(
  productId: string,
  limit: number
): Promise<ProductSummary[]> {
  if (!isUuid(productId)) return [];
  const product = await db.product.findFirst({
    where: { id: productId, status: "active" },
    select: {
      priceCents: true,
      categoryId: true,
      category: { select: { parentId: true } },
    },
  });
  if (!product) return [];
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active'
      AND p.id <> ${productId}::uuid
      AND (p.category_id = ${product.categoryId}::uuid
           OR (${product.category.parentId}::uuid IS NOT NULL
               AND c.parent_id = ${product.category.parentId}::uuid))
    ORDER BY (p.category_id = ${product.categoryId}::uuid) DESC,
             abs(p.price_cents - ${product.priceCents}) ASC,
             p.name ASC
    LIMIT ${Math.max(0, Math.min(24, Math.trunc(limit)))}`;
  return loadSummaries(rows.map((r) => r.id));
}
