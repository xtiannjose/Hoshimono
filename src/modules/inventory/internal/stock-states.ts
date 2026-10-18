import { db } from "@/lib/db";

/** What a Customer may see: never the count (docs/03-ARCHITECTURE.md section 9). */
export type StockState = "in_stock" | "low" | "out";

/**
 * Stock state per Product at a Hub. Available is on hand minus reserved;
 * "low" is at or under the Product's threshold ("Only a few left").
 * A Product with no stock row is out.
 */
export async function getStockStates(
  productIds: string[],
  hubId: string
): Promise<Record<string, StockState>> {
  const levels = await db.stockLevel.findMany({
    where: { hubId, productId: { in: productIds } },
    select: {
      productId: true,
      onHand: true,
      reserved: true,
      lowStockThreshold: true,
    },
  });
  const byProduct = new Map(levels.map((l) => [l.productId, l]));
  const states: Record<string, StockState> = {};
  for (const id of productIds) {
    const level = byProduct.get(id);
    const available = level ? level.onHand - level.reserved : 0;
    states[id] =
      available <= 0
        ? "out"
        : available <= (level?.lowStockThreshold ?? 0)
          ? "low"
          : "in_stock";
  }
  return states;
}
