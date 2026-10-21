import { productName } from "@/lib/product-name";
import {
  getCartQuantities,
  setLineQuantity,
  type CartOwner,
} from "@/modules/cart";
import { getProductSummaries, listRelatedProducts } from "@/modules/catalog";
import { MAX_LINE_QUANTITY } from "@/modules/pricing";

import { getRecipe, ingredientCount } from "./recipes";

/** How many similar Products the Recipe page may offer per ingredient. */
export const SIMILAR_LIMIT = 8;

export type RecipePick = {
  ingredientId: string;
  /** The ingredient's Product, or a similar one offered in its place. */
  productId: string;
};

export type AddRecipeResult =
  | {
      ok: true;
      /** Units added to the Cart. */
      added: number;
      /** Product names that could not be added at all. */
      soldOut: string[];
      /** Product names added only up to what is left. */
      capped: string[];
    }
  | { ok: false; reason: "not_found" };

/**
 * Add a published Recipe's ticked rows to the Cart for `servings`, on top
 * of what is there (ADR 0013). Counts come from the Recipe, never the
 * browser; a pick that is neither the ingredient's Product nor a similar
 * one is ignored, as are plain-text rows.
 */
export async function addRecipeToCart(
  owner: CartOwner,
  input: { slug: string; servings: number; picks: RecipePick[] },
  hubId: string | null
): Promise<AddRecipeResult> {
  const recipe = await getRecipe(input.slug);
  if (!recipe || !Number.isInteger(input.servings) || input.servings < 1)
    return { ok: false, reason: "not_found" };
  const servings = Math.min(input.servings, 50);

  const wanted = new Map<string, number>();
  for (const pick of input.picks) {
    const row = recipe.ingredients.find((i) => i.id === pick.ingredientId);
    if (!row?.productId) continue;
    const allowed =
      pick.productId === row.productId ||
      (await listRelatedProducts(row.productId, SIMILAR_LIMIT)).some(
        (p) => p.id === pick.productId
      );
    if (!allowed) continue;
    const count = ingredientCount(row, servings, recipe.servings);
    wanted.set(pick.productId, (wanted.get(pick.productId) ?? 0) + count);
  }

  const inCart = await getCartQuantities(owner);
  const names = new Map(
    (await getProductSummaries([...wanted.keys()])).map((p) => [
      p.id,
      productName(p),
    ])
  );
  const nameOf = (id: string) =>
    names.get(id) ??
    recipe.ingredients.find((i) => i.productId === id)?.name ??
    "An item";
  let added = 0;
  const soldOut: string[] = [];
  const capped: string[] = [];
  for (const [productId, count] of wanted) {
    const before = inCart[productId] ?? 0;
    const target = Math.min(before + count, MAX_LINE_QUANTITY);
    const result = await setLineQuantity(owner, productId, target, hubId);
    if (!result.ok) {
      soldOut.push(nameOf(productId));
      continue;
    }
    added += Math.max(0, result.quantity - before);
    if (result.capped) capped.push(nameOf(productId));
  }
  return { ok: true, added, soldOut, capped };
}
