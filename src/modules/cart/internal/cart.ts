import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { SubstitutionPreference } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getProductSummaries, type ProductSummary } from "@/modules/catalog";
import {
  getAvailability,
  type Availability,
  type StockState,
} from "@/modules/inventory";
import {
  MAX_LINE_QUANTITY,
  priceCart,
  type PricedCart,
  type ZoneFees,
} from "@/modules/pricing";

/** A signed-in Customer, or a guest holding the token from their cookie. */
export type CartOwner = { customerId: string } | { guestToken: string };

export type CartContext = { hubId: string | null; zone: ZoneFees | null };

export type CartLineView = {
  product: ProductSummary;
  quantity: number;
  substitution: {
    preference: SubstitutionPreference;
    preferredProductId: string | null;
  };
  note: string | null;
  stock: StockState;
  /** The price when the line was last set, when today's price differs. */
  priceWasCents: number | null;
  /** The Hub has fewer free than the line asks for. */
  short: boolean;
};

export type CartView = {
  lines: CartLineView[];
  /** Lines whose Product is no longer sold; not shown and not totalled. */
  unavailableCount: number;
  /** Totals from priceCart, leaving out lines that are out of stock. */
  priced: PricedCart;
  itemCount: number;
};

export type SetQuantityResult =
  | { ok: true; quantity: number; capped: boolean }
  | { ok: false; reason: "not_found" | "out_of_stock" };

export const MAX_NOTE_LENGTH = 200;

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

// Without a Hub nothing is in stock.
const NO_STOCK: Record<string, Availability> = {};

/** 256 random bits for the guest Cart cookie. Only its hash is stored. */
export function newGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isGuestToken(value: string | undefined): value is string {
  return value !== undefined && TOKEN.test(value);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function ownerWhere(owner: CartOwner | null): Prisma.CartWhereInput | null {
  if (!owner) return null;
  if ("customerId" in owner) {
    return { customerId: owner.customerId, checkedOutAt: null };
  }
  if (!isGuestToken(owner.guestToken)) return null;
  return { guestTokenHash: hashToken(owner.guestToken), checkedOutAt: null };
}

// One open Cart per owner. Two first adds at once both insert; the unique
// indexes keep one and ON CONFLICT DO NOTHING drops the other.
async function ensureCartId(owner: CartOwner): Promise<string> {
  const where = ownerWhere(owner);
  if (!where) throw new Error("Invalid guest Cart token");
  const found = await db.cart.findFirst({ where, select: { id: true } });
  if (found) return found.id;

  const id = randomUUID();
  if ("customerId" in owner) {
    await db.$executeRaw`
      INSERT INTO carts (id, customer_id, updated_at)
      VALUES (${id}::uuid, ${owner.customerId}::uuid, now())
      ON CONFLICT DO NOTHING`;
  } else {
    await db.$executeRaw`
      INSERT INTO carts (id, guest_token_hash, updated_at)
      VALUES (${id}::uuid, ${hashToken(owner.guestToken)}, now())
      ON CONFLICT DO NOTHING`;
  }
  return (await db.cart.findFirstOrThrow({ where, select: { id: true } })).id;
}

/**
 * Set a line to `quantity`; 0 removes it. Adds are capped at what the Hub
 * has free and at MAX_LINE_QUANTITY. Remembers today's price so a later
 * change can be flagged.
 */
export async function setLineQuantity(
  owner: CartOwner,
  productId: string,
  quantity: number,
  hubId: string | null
): Promise<SetQuantityResult> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Not a Cart quantity: ${quantity}`);
  }
  const [product] = await getProductSummaries([productId]);
  if (!product) return { ok: false, reason: "not_found" };

  if (quantity === 0) {
    const where = ownerWhere(owner);
    if (where) {
      await db.cartLine.deleteMany({ where: { productId, cart: where } });
    }
    return { ok: true, quantity: 0, capped: false };
  }

  const free = hubId
    ? (await getAvailability([productId], hubId))[productId].available
    : 0;
  const allowed = Math.min(MAX_LINE_QUANTITY, free);
  if (allowed === 0) return { ok: false, reason: "out_of_stock" };
  const set = Math.min(quantity, allowed);

  const cartId = await ensureCartId(owner);
  await db.$executeRaw`
    INSERT INTO cart_lines (id, cart_id, product_id, quantity, seen_price_cents, updated_at)
    VALUES (${randomUUID()}::uuid, ${cartId}::uuid, ${productId}::uuid, ${set}, ${product.priceCents}, now())
    ON CONFLICT (cart_id, product_id) DO UPDATE
      SET quantity = EXCLUDED.quantity,
          seen_price_cents = EXCLUDED.seen_price_cents,
          updated_at = now()`;
  await db.$executeRaw`UPDATE carts SET updated_at = now() WHERE id = ${cartId}::uuid`;
  return { ok: true, quantity: set, capped: set < quantity };
}

/** The open Cart, priced. An unknown owner gets an empty Cart. */
export async function getCart(
  owner: CartOwner | null,
  context: CartContext
): Promise<CartView> {
  const where = ownerWhere(owner);
  const cart = where
    ? await db.cart.findFirst({
        where,
        select: {
          lines: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              productId: true,
              quantity: true,
              seenPriceCents: true,
              substitutionPreference: true,
              preferredProductId: true,
              note: true,
            },
          },
        },
      })
    : null;
  const rows = cart?.lines ?? [];
  const ids = rows.map((r) => r.productId);
  const [products, availability] = await Promise.all([
    getProductSummaries(ids),
    context.hubId ? getAvailability(ids, context.hubId) : NO_STOCK,
  ]);
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = rows.flatMap((row): CartLineView[] => {
    const product = byId.get(row.productId);
    if (!product) return [];
    const free = availability[row.productId] ?? { available: 0, state: "out" };
    return [
      {
        product,
        quantity: row.quantity,
        substitution: {
          preference: row.substitutionPreference,
          preferredProductId: row.preferredProductId,
        },
        note: row.note,
        stock: free.state,
        priceWasCents:
          row.seenPriceCents === product.priceCents ? null : row.seenPriceCents,
        short: free.available < row.quantity,
      },
    ];
  });

  const priced = priceCart(
    lines
      .filter((l) => l.stock !== "out")
      .map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        unitPriceCents: l.product.priceCents,
        taxClass: l.product.taxClass,
        isWeighed: l.product.isWeighed,
      })),
    { zone: context.zone }
  );

  return {
    lines,
    unavailableCount: rows.length - lines.length,
    priced,
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

/** Product id to quantity, for the steppers on Product cards. */
export async function getCartQuantities(
  owner: CartOwner | null
): Promise<Record<string, number>> {
  const where = ownerWhere(owner);
  if (!where) return {};
  const lines = await db.cartLine.findMany({
    where: { cart: where },
    select: { productId: true, quantity: true },
  });
  return Object.fromEntries(lines.map((l) => [l.productId, l.quantity]));
}

/**
 * What to do if the Product is out at pick time. "preferred" needs another
 * Product that is still sold. False when the line or the choice is not valid.
 */
export async function setSubstitution(
  owner: CartOwner,
  productId: string,
  choice: {
    preference: SubstitutionPreference;
    preferredProductId: string | null;
  }
): Promise<boolean> {
  const where = ownerWhere(owner);
  if (!where) return false;
  const preferred =
    choice.preference === "preferred" ? choice.preferredProductId : null;
  if (choice.preference === "preferred") {
    if (!preferred || preferred === productId) return false;
    if ((await getProductSummaries([preferred])).length === 0) return false;
  }
  const { count } = await db.cartLine.updateMany({
    where: { productId, cart: where },
    data: {
      substitutionPreference: choice.preference,
      preferredProductId: preferred,
    },
  });
  return count > 0;
}

/** A note for the Picker, such as "lean cuts". Blank clears it. */
export async function setLineNote(
  owner: CartOwner,
  productId: string,
  note: string
): Promise<boolean> {
  const where = ownerWhere(owner);
  const text = note.trim();
  if (!where || text.length > MAX_NOTE_LENGTH) return false;
  const { count } = await db.cartLine.updateMany({
    where: { productId, cart: where },
    data: { note: text || null },
  });
  return count > 0;
}

/**
 * Move a guest Cart into the Customer's Cart on sign-in (docs/03 section 5).
 * Quantities are summed, capped by what the Hub has free, and never lowered
 * below what the Customer already had. The Customer's own line settings win.
 * The guest Cart row is locked first, so a double sign-in merges once.
 */
export async function mergeGuestCart(
  guestToken: string,
  customerId: string,
  hubId: string | null
): Promise<void> {
  if (!isGuestToken(guestToken)) return;
  const hash = hashToken(guestToken);

  await db.$transaction(async (tx) => {
    const [guest] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM carts
      WHERE guest_token_hash = ${hash} AND checked_out_at IS NULL
      FOR UPDATE`;
    if (!guest) return;

    const mine = await tx.cart.findFirst({
      where: { customerId, checkedOutAt: null },
      select: { id: true, lines: true },
    });
    if (!mine) {
      await tx.cart.update({
        where: { id: guest.id },
        data: { customerId, guestTokenHash: null },
      });
      return;
    }

    const guestLines = await tx.cartLine.findMany({
      where: { cartId: guest.id },
    });
    const ids = guestLines.map((l) => l.productId);
    const availability = hubId ? await getAvailability(ids, hubId) : NO_STOCK;
    const existing = new Map(mine.lines.map((l) => [l.productId, l]));

    for (const line of guestLines) {
      const had = existing.get(line.productId)?.quantity ?? 0;
      const wanted = Math.min(MAX_LINE_QUANTITY, had + line.quantity);
      const free = availability[line.productId]?.available ?? 0;
      const quantity = Math.max(had, Math.min(wanted, free));
      if (quantity === had) continue;
      if (had > 0) {
        await tx.cartLine.update({
          where: {
            cartId_productId: { cartId: mine.id, productId: line.productId },
          },
          data: { quantity },
        });
      } else {
        await tx.cartLine.create({
          data: {
            cartId: mine.id,
            productId: line.productId,
            quantity,
            seenPriceCents: line.seenPriceCents,
            substitutionPreference: line.substitutionPreference,
            preferredProductId: line.preferredProductId,
            note: line.note,
          },
        });
      }
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}
