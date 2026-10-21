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
  // No clamp at 0: releasing more than was reserved breaks the stock_levels
  // check and throws, so an accounting bug surfaces instead of hiding.
  for (const { productId, quantity } of sorted(lines)) {
    const updated = await tx.$executeRaw`
      UPDATE stock_levels
      SET reserved = reserved - ${quantity}, updated_at = now()
      WHERE product_id = ${productId}::uuid AND hub_id = ${hubId}::uuid`;
    if (updated !== 1) {
      throw new Error(`No stock level for ${productId} at hub ${hubId}`);
    }
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

/** One Product of a picked Order: what was reserved for it and what was taken. */
export type PickedStock = {
  productId: string;
  reserved: number;
  taken: number;
};

// One row per Product: a substitute can be a Product another line ordered.
function merge(lines: PickedStock[]): PickedStock[] {
  const byId = new Map<string, PickedStock>();
  for (const l of lines) {
    const row = byId.get(l.productId) ?? {
      productId: l.productId,
      reserved: 0,
      taken: 0,
    };
    row.reserved += l.reserved;
    row.taken += l.taken;
    byId.set(l.productId, row);
  }
  return [...byId.values()].sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );
}

/**
 * Picking is done (ADR 0012): the Order's reservations are released and
 * what was packed leaves the shelf count. A substitute was not reserved,
 * so its count never drops below what other Orders have reserved; the
 * movement records what was actually taken.
 */
export async function pickStock(
  tx: Prisma.TransactionClient,
  {
    hubId,
    orderId,
    lines,
  }: { hubId: string; orderId: string; lines: PickedStock[] }
): Promise<void> {
  const movements: Prisma.StockMovementCreateManyInput[] = [];
  for (const { productId, reserved, taken } of merge(lines)) {
    const [row] = await tx.$queryRaw<{ on_hand: number; reserved: number }[]>`
      SELECT on_hand, reserved FROM stock_levels
      WHERE product_id = ${productId}::uuid AND hub_id = ${hubId}::uuid
      FOR UPDATE`;
    if (!row)
      throw new Error(`No stock level for ${productId} at hub ${hubId}`);
    // A negative reserved breaks the table check: an accounting bug surfaces.
    const reservedAfter = row.reserved - reserved;
    const onHandAfter = Math.max(row.on_hand - taken, reservedAfter);
    await tx.stockLevel.update({
      where: { productId_hubId: { productId, hubId } },
      data: { reserved: reservedAfter, onHand: onHandAfter },
    });
    if (reserved > 0) {
      movements.push({
        productId,
        hubId,
        orderId,
        delta: -reserved,
        reason: "release",
      });
    }
    const delta = onHandAfter - row.on_hand;
    if (delta !== 0) {
      movements.push({ productId, hubId, orderId, delta, reason: "pick" });
    }
  }
  if (movements.length > 0)
    await tx.stockMovement.createMany({ data: movements });
}

/** An Order cancelled after picking: what was taken goes back on the shelf. */
export async function returnStock(
  tx: Prisma.TransactionClient,
  {
    hubId,
    orderId,
    lines,
  }: { hubId: string; orderId: string; lines: StockLine[] }
): Promise<void> {
  const back = merge(
    lines.map((l) => ({
      productId: l.productId,
      reserved: 0,
      taken: l.quantity,
    }))
  ).filter((l) => l.taken > 0);
  for (const { productId, taken } of back) {
    await tx.$executeRaw`
      UPDATE stock_levels SET on_hand = on_hand + ${taken}, updated_at = now()
      WHERE product_id = ${productId}::uuid AND hub_id = ${hubId}::uuid`;
  }
  if (back.length > 0) {
    await tx.stockMovement.createMany({
      data: back.map((l) => ({
        productId: l.productId,
        hubId,
        orderId,
        delta: l.taken,
        reason: "return" as const,
      })),
    });
  }
}
