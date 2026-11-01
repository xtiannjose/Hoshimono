import type { Prisma } from "@/generated/prisma/client";
import type { StockMovementReason } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// Stock kept by the Hub (ADR 0012). Callers check requireStaff("stock").
// shortcut: Product names and Staff names come through Prisma relations.

type StockErrors = {
  quantity?: string;
  counted?: string;
  note?: string;
  threshold?: string;
  form?: string;
};
type StockResult = { ok: true } | { ok: false; errors: StockErrors };

const whole = (n: number) => Number.isInteger(n) && n >= 0;

/** Lock one stock row; null when the Product is not stocked at the Hub. */
async function locked(
  tx: Prisma.TransactionClient,
  hubId: string,
  productId: string
) {
  const [row] = await tx.$queryRaw<{ on_hand: number; reserved: number }[]>`
    SELECT on_hand, reserved FROM stock_levels
    WHERE product_id = ${productId}::uuid AND hub_id = ${hubId}::uuid
    FOR UPDATE`;
  return row ?? null;
}

/** Set the shelf count and record why, in one transaction. */
async function move(
  hubId: string,
  productId: string,
  staffId: string,
  reason: StockMovementReason,
  note: string | null,
  next: (row: { on_hand: number; reserved: number }) => number | StockErrors
): Promise<StockResult> {
  return db.$transaction(async (tx) => {
    const row = await locked(tx, hubId, productId);
    if (!row)
      return {
        ok: false,
        errors: { form: "This Product has no stock at the Hub." },
      };
    const onHand = next(row);
    if (typeof onHand !== "number") return { ok: false, errors: onHand };
    await tx.stockLevel.update({
      where: { productId_hubId: { productId, hubId } },
      data: { onHand },
    });
    if (onHand !== row.on_hand) {
      await tx.stockMovement.create({
        data: {
          productId,
          hubId,
          staffId,
          reason,
          note,
          delta: onHand - row.on_hand,
        },
      });
    }
    return { ok: true };
  });
}

/** What a supplier delivered. */
export function receiveStock(
  hubId: string,
  productId: string,
  quantity: number,
  staffId: string,
  note = ""
): Promise<StockResult> {
  if (!whole(quantity) || quantity === 0) {
    return Promise.resolve({
      ok: false,
      errors: { quantity: "Enter how many came in." },
    });
  }
  return move(
    hubId,
    productId,
    staffId,
    "receipt",
    note.trim() || null,
    (r) => r.on_hand + quantity
  );
}

/** Spoiled, damaged or lost: never what Orders have reserved. */
export function recordShrink(
  hubId: string,
  productId: string,
  quantity: number,
  staffId: string,
  note: string
): Promise<StockResult> {
  if (!whole(quantity) || quantity === 0) {
    return Promise.resolve({
      ok: false,
      errors: { quantity: "Enter how many to take off." },
    });
  }
  if (!note.trim()) {
    return Promise.resolve({
      ok: false,
      errors: { note: "Say what happened to them." },
    });
  }
  return move(hubId, productId, staffId, "shrink", note.trim(), (r) => {
    const free = Math.max(0, r.on_hand - r.reserved);
    return quantity > free
      ? { quantity: `Only ${free} are not reserved for Orders.` }
      : r.on_hand - quantity;
  });
}

/**
 * A physical count sets the shelf number, even below what Orders have
 * reserved: those Orders come up short at the pick (ADR 0022).
 */
export function countStock(
  hubId: string,
  productId: string,
  counted: number,
  staffId: string,
  note = ""
): Promise<StockResult> {
  if (!whole(counted)) {
    return Promise.resolve({
      ok: false,
      errors: { counted: "Enter the number you counted." },
    });
  }
  return move(
    hubId,
    productId,
    staffId,
    "adjustment",
    note.trim() || null,
    () => counted
  );
}

/** At or under this many free, a Product shows as low. */
export async function setLowStockThreshold(
  hubId: string,
  productId: string,
  threshold: number
): Promise<StockResult> {
  if (!whole(threshold)) {
    return { ok: false, errors: { threshold: "Enter 0 or more." } };
  }
  const { count } = await db.stockLevel.updateMany({
    where: { hubId, productId },
    data: { lowStockThreshold: threshold },
  });
  return count === 1
    ? { ok: true }
    : { ok: false, errors: { form: "This Product has no stock at the Hub." } };
}

export type StockRow = {
  productId: string;
  name: string;
  onHand: number;
  reserved: number;
  free: number;
  /** Reserved beyond the shelf: Orders that will come up short. */
  short: number;
  lowStockThreshold: number;
  low: boolean;
};

/** The Hub's stock by Product name; `low` keeps only those at or under threshold. */
export async function listStockForAdmin(
  hubId: string,
  { q, low }: { q?: string; low?: boolean } = {}
): Promise<StockRow[]> {
  const text = q?.trim();
  const rows = await db.stockLevel.findMany({
    where: {
      hubId,
      product: {
        status: { not: "archived" },
        ...(text
          ? {
              OR: [
                { name: { contains: text, mode: "insensitive" } },
                { brand: { contains: text, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: { product: { name: "asc" } },
    select: {
      productId: true,
      onHand: true,
      reserved: true,
      lowStockThreshold: true,
      product: { select: { name: true, brand: true } },
    },
  });
  return rows
    .map((r) => {
      const free = Math.max(0, r.onHand - r.reserved);
      return {
        productId: r.productId,
        name: r.product.brand
          ? `${r.product.brand} ${r.product.name}`
          : r.product.name,
        onHand: r.onHand,
        reserved: r.reserved,
        free,
        short: Math.max(0, r.reserved - r.onHand),
        lowStockThreshold: r.lowStockThreshold,
        low: free <= r.lowStockThreshold,
      };
    })
    .filter((r) => !low || r.low);
}

/** A Product's latest stock movements, newest first. */
export async function stockHistory(
  hubId: string,
  productId: string,
  limit = 20
) {
  const rows = await db.stockMovement.findMany({
    where: { hubId, productId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      delta: true,
      reason: true,
      note: true,
      createdAt: true,
      staff: { select: { name: true } },
      order: { select: { orderNo: true } },
    },
  });
  return rows.map((m) => ({
    id: m.id,
    at: m.createdAt,
    delta: m.delta,
    reason: m.reason,
    note: m.note,
    staffName: m.staff?.name ?? null,
    orderNo: m.order?.orderNo ?? null,
  }));
}
