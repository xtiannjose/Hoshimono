import type { Metadata } from "next";
import { Suspense } from "react";

import { CartSync } from "@/components/cart/cart-button";
import { CartPageBody } from "@/components/cart/cart-page-body";
import { getCart } from "@/modules/cart";

import { cartContext, readCartOwner } from "./owner";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Your cart</h1>
      <div data-no-cart-bar hidden />
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
    </>
  );
}

function CartPageSkeleton() {
  return (
    <div aria-hidden className="mt-6 grid gap-3 md:max-w-2xl">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-muted rounded-field h-24 animate-pulse" />
      ))}
    </div>
  );
}
