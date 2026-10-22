import "server-only";

import type { CartNotice } from "@/i18n/messages";
import { productName } from "@/lib/product-name";
import { addLines, getCart, type CartView } from "@/modules/cart";
import { getProductSummaries } from "@/modules/catalog";

import { cartContext, writeCartOwner } from "./owner";

/**
 * What filling the Cart from a Reorder, list or Recipe hands back: the
 * client words it in the page's language (cart.filled). A null name is a
 * Product no longer sold.
 */
export type FillResult = {
  cart: CartView;
  added: number;
  soldOut: (string | null)[];
  capped: (string | null)[];
  notice?: CartNotice;
};

/** Add Products on top of the Cart and say what happened (ADR 0014). */
export async function fillCart(
  lines: { productId: string; quantity: number }[]
): Promise<FillResult> {
  const owner = await writeCartOwner();
  const context = await cartContext(owner);
  if (!owner)
    return {
      cart: await getCart(owner, context),
      added: 0,
      soldOut: [],
      capped: [],
      notice: "busy",
    };
  const result = await addLines(owner, lines, context.hubId);
  const names = new Map(
    (await getProductSummaries([...result.soldOut, ...result.capped])).map(
      (p) => [p.id, productName(p)]
    )
  );
  const name = (id: string) => names.get(id) ?? null;
  return {
    cart: await getCart(owner, context),
    added: result.added,
    soldOut: result.soldOut.map(name),
    capped: result.capped.map(name),
  };
}
