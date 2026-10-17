"use server";

import { z } from "zod";

import {
  getCart,
  MAX_NOTE_LENGTH,
  setLineNote,
  setLineQuantity,
  setSubstitution,
  type CartView,
} from "@/modules/cart";
import { listRelatedProducts } from "@/modules/catalog";

import { cartContext, readCartOwner, writeCartOwner } from "./owner";

// Every action returns the whole Cart as the server now sees it, so the
// client replaces its optimistic guess with the truth (CRT-2).

export type CartResult = { cart: CartView; message?: string };

const productId = z.guid();

async function currentCart(): Promise<CartView> {
  return getCart(await readCartOwner(), await cartContext());
}

export async function loadCart(): Promise<CartView> {
  return currentCart();
}

export async function setQuantity(
  id: string,
  quantity: number
): Promise<CartResult> {
  const input = z
    .object({ id: productId, quantity: z.int().min(0).max(999) })
    .safeParse({ id, quantity });
  if (!input.success) {
    return { cart: await currentCart(), message: "That did not work." };
  }
  const owner = await writeCartOwner();
  const context = await cartContext();
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
  const owner = await writeCartOwner();
  const saved =
    input.success && (await setSubstitution(owner, input.data.id, input.data));
  const cart = await getCart(owner, await cartContext());
  return saved ? { cart } : { cart, message: "Please pick an item." };
}

export async function saveNote(id: string, note: string): Promise<CartResult> {
  const input = z
    .object({ id: productId, note: z.string().max(MAX_NOTE_LENGTH * 2) })
    .safeParse({ id, note });
  const owner = await writeCartOwner();
  const saved =
    input.success && (await setLineNote(owner, input.data.id, input.data.note));
  const cart = await getCart(owner, await cartContext());
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
    name: p.brand ? `${p.brand} ${p.name}` : p.name,
    priceCents: p.priceCents,
  }));
}
