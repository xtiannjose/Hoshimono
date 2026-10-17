import type { Prisma } from "@/generated/prisma/client";

export type StockLine = { productId: string; quantity: number };

/** Thrown inside the Order transaction so it rolls back; lists what ran short. */
export class OutOfStockError extends Error {
  constructor(readonly productIds: string[]) {
    super(`Out of stock: ${productIds.join(", ")}`);
  }
}

// Same Product order in every transaction, so two Orders sharing Products
// wait for each other instead of deadlocking.
const sorted = (lines: StockLine[]) =>
  [...lines].sort((a, b) => a.productId.localeCompare(b.productId));

/**
 * Reserve stock for an Order at a Hub (docs/03 section 9): each line is
 * one guarded UPDATE that only succeeds while enough is free, so two
 * checkouts can never both take the last unit. Any shortfall throws
 * OutOfStockError after checking every line. For reserve and release
 * movements, `delta` is the change in `reserved`.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  {
    hubId,
    orderId,
    lines,
  }: { hubId: string; orderId: string; lines: StockLine[] }
): Promise<void> {
  const short: string[] = [];
  for (const { productId, quantity } of sorted(lines)) {
    const updated = await tx.$executeRaw`
      UPDATE stock_levels
      SET reserved = reserved + ${quantity}, updated_at = now()
      WHERE product_id = ${productId}::uuid AND hub_id = ${hubId}::uuid
        AND on_hand - reserved >= ${quantity}`;
    if (updated === 0) short.push(productId);
  }
  if (short.length > 0) throw new OutOfStockError(short);
  await tx.stockMovement.createMany({
    data: lines.map((l) => ({
      productId: l.productId,
      hubId,
      orderId,
      delta: l.quantity,
      reason: "reserve" as const,
    })),
  });
}

/** Give reserved stock back, such as when an Order is cancelled. */
export async function releaseStock(
  tx: Prisma.TransactionClient,
  {
    hubId,
    orderId,
    lines,
  }: { hubId: string; orderId: string; lines: StockLine[] }
): Promise<void> {
  for (const { productId, quantity } of sorted(lines)) {
    await tx.$executeRaw`
      UPDATE stock_levels
      SET reserved = GREATEST(reserved - ${quantity}, 0), updated_at = now()
      WHERE product_id = ${productId}::uuid AND hub_id = ${hubId}::uuid`;
  }
  await tx.stockMovement.createMany({
    data: lines.map((l) => ({
      productId: l.productId,
      hubId,
      orderId,
      delta: -l.quantity,
      reason: "release" as const,
    })),
  });
}
