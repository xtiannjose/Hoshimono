"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { CartNotice } from "@/i18n/messages";
import { productName } from "@/lib/product-name";
import {
  clearCartVoucher,
  getCart,
  getCartId,
  MAX_NOTE_LENGTH,
  setLineNote,
  setCartVoucher,
  setLineQuantity,
  setSubstitution,
  type CartView,
} from "@/modules/cart";
import { listRelatedProducts } from "@/modules/catalog";
import { getDefaultAddress } from "@/modules/customers";
import { getSlotHold, listSlots, resolveZone } from "@/modules/delivery";
import { MAX_LINE_QUANTITY } from "@/modules/pricing";

import { cartContext, readCartOwner, writeCartOwner } from "./owner";

// Every action returns the whole Cart as the server now sees it, so the
// client replaces its optimistic guess with the truth (CRT-2). Anything
// else to say is a notice the client words in the page's language.

export type CartResult = { cart: CartView; notice?: CartNotice };

const productId = z.guid();

async function currentCart(): Promise<CartView> {
  const owner = await readCartOwner();
  return getCart(owner, await cartContext(owner));
}

export async function loadCart(): Promise<CartView> {
  return currentCart();
}

export type DeliveryRow = {
  startsAt: Date;
  endsAt: Date;
  /** Set when this Cart holds the Slot. */
  heldUntil: Date | null;
  address: { label: string; barangay: string };
};

/**
 * The cart drawer's delivery row (docs/05 CartDrawer): the Slot held for
 * this Cart, else the next open one for the Customer's address. Null for a
 * guest or an address we do not serve; the drawer then says it generally.
 */
export async function loadDelivery(): Promise<DeliveryRow | null> {
  const owner = await readCartOwner();
  if (!owner || !("customerId" in owner)) return null;
  const address = await getDefaultAddress(owner.customerId);
  const zone = address ? await resolveZone(address) : null;
  if (!address || !zone) return null;
  const now = new Date();
  const cartId = await getCartId(owner);
  const [slots, hold] = await Promise.all([
    listSlots(zone.hubId, { cartId, now }),
    cartId ? getSlotHold(cartId, now) : null,
  ]);
  // A hold made for another address's Hub is not in this list: show the next.
  const held = hold && slots.find((s) => s.id === hold.slotId);
  const place = { label: address.label, barangay: address.barangay };
  if (hold && held) {
    return {
      startsAt: held.startsAt,
      endsAt: held.endsAt,
      heldUntil: hold.expiresAt,
      address: place,
    };
  }
  const next = slots.find((s) => s.state !== "full");
  return next
    ? {
        startsAt: next.startsAt,
        endsAt: next.endsAt,
        heldUntil: null,
        address: place,
      }
    : null;
}

export async function setQuantity(
  id: string,
  quantity: number
): Promise<CartResult> {
  const input = z
    .object({ id: productId, quantity: z.int().min(0).max(MAX_LINE_QUANTITY) })
    .safeParse({ id, quantity });
  if (!input.success) return { cart: await currentCart(), notice: "invalid" };
  const owner = await writeCartOwner();
  if (!owner) return { cart: await currentCart(), notice: "busy" };
  const context = await cartContext(owner);
  const result = await setLineQuantity(
    owner,
    input.data.id,
    input.data.quantity,
    context.hubId
  );
  const cart = await getCart(owner, context);
  if (!result.ok) {
    return {
      cart,
      notice: result.reason === "out_of_stock" ? "sold_out" : "not_sold",
    };
  }
  return result.capped ? { cart, notice: "capped" } : { cart };
}

const choice = z.object({
  id: productId,
  preference: z.enum(["allow", "preferred", "none"]),
  preferredProductId: z.guid().nullable(),
});

export async function chooseSubstitution(
  id: string,
  preference: string,
  preferredProductId: string | null
): Promise<CartResult> {
  const input = choice.safeParse({ id, preference, preferredProductId });
  const owner = await readCartOwner();
  const saved =
    owner !== null &&
    input.success &&
    (await setSubstitution(owner, input.data.id, input.data));
  const cart = await getCart(owner, await cartContext(owner));
  return saved ? { cart } : { cart, notice: "pick_item" };
}

export async function saveNote(id: string, note: string): Promise<CartResult> {
  const input = z
    .object({ id: productId, note: z.string().max(MAX_NOTE_LENGTH * 2) })
    .safeParse({ id, note });
  const owner = await readCartOwner();
  const saved =
    owner !== null &&
    input.success &&
    (await setLineNote(owner, input.data.id, input.data.note));
  const cart = await getCart(owner, await cartContext(owner));
  return saved ? { cart } : { cart, notice: "note_too_long" };
}

/** Alternatives for "I'll choose": the nearest Products in the same aisle. */
export async function listAlternatives(
  id: string
): Promise<{ id: string; name: string; priceCents: number }[]> {
  if (!productId.safeParse(id).success) return [];
  const related = await listRelatedProducts(id, 6);
  return related.map((p) => ({
    id: p.id,
    name: productName(p),
    priceCents: p.priceCents,
  }));
}

/** Keep a Voucher on the Cart (ADR 0015); the reply says why if it cannot. */
export async function applyVoucherAction(code: string): Promise<CartResult> {
  const owner = await readCartOwner();
  const result = owner
    ? await setCartVoucher(owner, String(code).slice(0, 40))
    : { ok: false as const, reason: "empty_cart" as const };
  // Checkout is server-rendered: show its new total too.
  refresh();
  return {
    cart: await currentCart(),
    ...(result.ok ? {} : { notice: result.reason }),
  };
}

export async function removeVoucherAction(): Promise<CartResult> {
  const owner = await readCartOwner();
  if (owner) await clearCartVoucher(owner);
  refresh();
  return { cart: await currentCart() };
}
