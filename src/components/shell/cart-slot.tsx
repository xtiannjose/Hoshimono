import { cartContext, readCartOwner } from "@/app/cart/owner";
import { CartButton, CartSync } from "@/components/cart/cart-button";
import { getCart } from "@/modules/cart";

/** The header's Cart, read per request inside a Suspense boundary. */
export async function CartSlot() {
  const owner = await readCartOwner();
  const view = await getCart(owner, await cartContext(owner));
  return (
    <>
      <CartSync view={view} />
      <CartButton />
    </>
  );
}
