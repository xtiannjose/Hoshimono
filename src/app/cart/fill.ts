import "server-only";

import { productName } from "@/lib/product-name";
import { addLines, getCart, type CartView } from "@/modules/cart";
import { getProductSummaries } from "@/modules/catalog";

import { cartContext, writeCartOwner } from "./owner";

/** What filling the Cart from a Reorder, list or Recipe hands back. */
export type FillResult = { cart: CartView; added: number; message: string };

const list = (names: string[]) =>
  names.length < 3
    ? names.join(" and ")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/** "Added 5 items to your cart. Sorry, X just sold out." (ADR 0013, 0014) */
export function fillMessage(
  added: number,
  soldOut: string[],
  capped: string[]
): string {
  const parts = [
    added > 0
      ? `Added ${added} ${added === 1 ? "item" : "items"} to your cart.`
      : "Nothing was added.",
  ];
  if (soldOut.length) parts.push(`Sorry, ${list(soldOut)} just sold out.`);
  if (capped.length)
    parts.push(
      `We added all we have of ${list(capped)}: there are only a few left.`
    );
  return parts.join(" ");
}

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
      message: "Too many new carts from your network. Please try again later.",
    };
  const result = await addLines(owner, lines, context.hubId);
  const names = new Map(
    (await getProductSummaries([...result.soldOut, ...result.capped])).map(
      (p) => [p.id, productName(p)]
    )
  );
  const name = (id: string) => names.get(id) ?? "an item no longer sold";
  return {
    cart: await getCart(owner, context),
    added: result.added,
    message: fillMessage(
      result.added,
      result.soldOut.map(name),
      result.capped.map(name)
    ),
  };
}
