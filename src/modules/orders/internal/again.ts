import { db } from "@/lib/db";

// Reorder and "Buy again" (ADR 0014).

/**
 * A Customer's own Order as Cart lines (the Products ordered, not their
 * substitutes), or null when the Order is not theirs.
 */
export async function getReorderLines(
  orderNo: string,
  customerId: string
): Promise<{ productId: string; quantity: number }[] | null> {
  const order = await db.order.findFirst({
    where: { orderNo, customerId },
    select: {
      lines: {
        orderBy: { createdAt: "asc" },
        select: { productId: true, orderedQty: true },
      },
    },
  });
  return order
    ? order.lines.map((l) => ({
        productId: l.productId,
        quantity: l.orderedQty,
      }))
    : null;
}

/**
 * Products in a Customer's delivered Orders, most often bought first, then
 * most lately; only those still sold.
 */
export async function listBoughtBefore(
  customerId: string,
  limit: number
): Promise<string[]> {
  const rows = await db.$queryRaw<{ product_id: string }[]>`
    SELECT l.product_id
    FROM order_lines l
    JOIN orders o ON o.id = l.order_id
    JOIN products p ON p.id = l.product_id AND p.status = 'active'
    WHERE o.customer_id = ${customerId}::uuid AND o.status = 'delivered'
    GROUP BY l.product_id
    ORDER BY count(DISTINCT o.id) DESC, max(o.delivered_at) DESC, l.product_id
    LIMIT ${limit}`;
  return rows.map((r) => r.product_id);
}
