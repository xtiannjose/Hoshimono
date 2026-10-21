"use server";

import { z } from "zod";

import { getCart } from "@/modules/cart";
import { addRecipeToCart } from "@/modules/content";

import { fillMessage, type FillResult } from "../cart/fill";
import { cartContext, writeCartOwner } from "../cart/owner";

const input = z.object({
  slug: z.string().min(1).max(120),
  servings: z.int().min(1).max(50),
  picks: z
    .array(z.object({ ingredientId: z.guid(), productId: z.guid() }))
    .max(60),
});

/**
 * Add a Recipe's ticked ingredients to the Cart (ADR 0013). The browser
 * sends only the servings and the ticked rows; counts come from the Recipe.
 */
export async function addRecipe(
  slug: string,
  servings: number,
  picks: { ingredientId: string; productId: string }[]
): Promise<FillResult> {
  const owner = await writeCartOwner();
  const parsed = input.safeParse({ slug, servings, picks });
  if (!owner || !parsed.success) {
    const context = await cartContext(owner);
    return {
      cart: await getCart(owner, context),
      added: 0,
      message: owner
        ? "That did not work. Please try again."
        : "Too many new carts from your network. Please try again later.",
    };
  }
  const context = await cartContext(owner);
  const result = await addRecipeToCart(owner, parsed.data, context.hubId);
  const cart = await getCart(owner, context);
  if (!result.ok)
    return { cart, added: 0, message: "This Recipe is no longer available." };
  return {
    cart,
    added: result.added,
    message: fillMessage(result.added, result.soldOut, result.capped),
  };
}
