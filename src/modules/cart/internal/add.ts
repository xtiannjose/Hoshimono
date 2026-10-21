import { MAX_LINE_QUANTITY } from "@/modules/pricing";

import { getCartQuantities, setLineQuantity, type CartOwner } from "./cart";

export type AddLinesResult = {
  /** Units added to the Cart. */
  added: number;
  /** Product ids that could not be added at all (sold out, not sold). */
  soldOut: string[];
  /** Product ids added only up to what is left. */
  capped: string[];
};

/**
 * Add Products on top of what the Cart holds, each capped by stock: a
 * Recipe, a Reorder or a Shopping List (ADR 0013, ADR 0014). Repeated
 * Products are summed.
 */
export async function addLines(
  owner: CartOwner,
  lines: { productId: string; quantity: number }[],
  hubId: string | null
): Promise<AddLinesResult> {
  const wanted = new Map<string, number>();
  for (const { productId, quantity } of lines)
    wanted.set(productId, (wanted.get(productId) ?? 0) + quantity);
  const inCart = await getCartQuantities(owner);
  const result: AddLinesResult = { added: 0, soldOut: [], capped: [] };
  for (const [productId, count] of wanted) {
    if (count < 1) continue;
    const before = inCart[productId] ?? 0;
    const target = Math.min(before + count, MAX_LINE_QUANTITY);
    const set = await setLineQuantity(owner, productId, target, hubId);
    if (!set.ok) {
      result.soldOut.push(productId);
      continue;
    }
    result.added += Math.max(0, set.quantity - before);
    if (set.capped) result.capped.push(productId);
  }
  return result;
}
