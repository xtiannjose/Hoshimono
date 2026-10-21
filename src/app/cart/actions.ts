"use server";

import { z } from "zod";

import { formatSlot, formatTime } from "@/lib/dates";
import { productName } from "@/lib/product-name";
import {
  getCart,
  getCartId,
  MAX_NOTE_LENGTH,
  setLineNote,
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
// client replaces its optimistic guess with the truth (CRT-2).

export type CartResult = { cart: CartView; message?: string };

const productId = z.guid();

async function currentCart(): Promise<CartView> {
  const owner = await readCartOwner();
  return getCart(owner, await cartContext(owner));
}

export async function loadCart(): Promise<CartView> {
  return currentCart();
}

export type DeliveryRow = { slot: string; note: string };

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
  if (hold && held) {
    return {
      slot: formatSlot(held.startsAt, held.endsAt),
      note: `Held for you until ${formatTime(hold.expiresAt)}`,
    };
  }
  const next = slots.find((s) => s.state !== "full");
  return next
    ? {
        slot: `Next: ${formatSlot(next.startsAt, next.endsAt)}`,
        note: `To ${address.label}, ${address.barangay}`,
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
  if (!input.success) {
    return { cart: await currentCart(), message: "That did not work." };
  }
  const owner = await writeCartOwner();
  if (!owner) {
    return {
      cart: await currentCart(),
      message: "Too many new carts from your network. Please try again later.",
    };
  }
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
      message:
        result.reason === "out_of_stock"
          ? "Sorry, that just sold out."
          : "Sorry, that item is no longer sold.",
    };
  }
  return result.capped
    ? { cart, message: "That is all we have for now." }
    : { cart };
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
  return saved ? { cart } : { cart, message: "Please pick an item." };
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
  return saved
    ? { cart }
    : { cart, message: `Notes can be up to ${MAX_NOTE_LENGTH} characters.` };
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
