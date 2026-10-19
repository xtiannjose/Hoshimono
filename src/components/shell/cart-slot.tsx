import { cartContext, readCartOwner } from "@/app/cart/owner";
import { CartButton, CartSync } from "@/components/cart/cart-button";
import { getCart } from "@/modules/cart";

/** The header's Cart, read per request inside a Suspense boundary. */
export async function CartSlot() {
  const owner = await readCartOwner();
  // A visitor with no Cart needs no Hub or Zone, so no database work.
  const context = owner
    ? await cartContext(owner)
    : { hubId: null, zone: null };
  const view = await getCart(owner, context);
  return (
    <>
      <CartSync view={view} />
      <CartButton />
    </>
  );
}
