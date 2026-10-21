import type { Metadata } from "next";
import { Suspense } from "react";

import { CartSync } from "@/components/cart/cart-button";
import { CartPageBody } from "@/components/cart/cart-page-body";
import { SaveToList } from "@/components/lists/save-to-list";
import { getCart, listShoppingLists } from "@/modules/cart";
import { Skeleton } from "@/components/ui/skeleton";

import { saveCartAction } from "../account/lists/actions";
import { cartContext, readCartOwner } from "./owner";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Your cart</h1>
      <Suspense fallback={<CartPageSkeleton />}>
        <CurrentCart />
      </Suspense>
    </section>
  );
}

async function CurrentCart() {
  const owner = await readCartOwner();
  const view = await getCart(owner, await cartContext(owner));
  return (
    <>
      <CartSync view={view} />
      <CartPageBody initial={view} />
      {owner && "customerId" in owner && view.lines.length > 0 && (
        <div className="mt-8">
          <SaveToList
            action={saveCartAction}
            lists={(await listShoppingLists(owner.customerId)).map((l) => ({
              id: l.id,
              name: l.name,
            }))}
            summary="Save this cart as a list"
            done="Saved every item to the list."
          />
        </div>
      )}
    </>
  );
}

function CartPageSkeleton() {
  return (
    <div aria-hidden className="mt-6 grid gap-3 md:max-w-2xl">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="rounded-field h-24" />
      ))}
    </div>
  );
}
