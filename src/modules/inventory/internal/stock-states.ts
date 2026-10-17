import { db } from "@/lib/db";

/** What a Customer may see: never the count (docs/03-ARCHITECTURE.md section 9). */
export type StockState = "in_stock" | "low" | "out";

export type Availability = { available: number; state: StockState };

/**
 * Free units per Product at a Hub: on hand minus reserved. "low" is at or
 * under the Product's threshold ("Only a few left"). A Product with no stock
 * row is out. The count is for server checks such as Cart limits; only the
 * state may reach a page.
 */
export async function getAvailability(
  productIds: string[],
  hubId: string
): Promise<Record<string, Availability>> {
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
  const result: Record<string, Availability> = {};
  for (const id of productIds) {
    const level = byProduct.get(id);
    const available = Math.max(0, level ? level.onHand - level.reserved : 0);
    const state: StockState =
      available === 0
        ? "out"
        : available <= (level?.lowStockThreshold ?? 0)
          ? "low"
          : "in_stock";
    result[id] = { available, state };
  }
  return result;
}

/** Stock state per Product at a Hub, without counts. */
export async function getStockStates(
  productIds: string[],
  hubId: string
): Promise<Record<string, StockState>> {
  const availability = await getAvailability(productIds, hubId);
  return Object.fromEntries(
    Object.entries(availability).map(([id, a]) => [id, a.state])
  );
}
