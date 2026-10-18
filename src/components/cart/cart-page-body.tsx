"use client";

import Link from "next/link";

import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/modules/cart";

import { CartLines, EmptyCart } from "./cart-contents";
import { useCart } from "./cart-store";
import { CartNotes, CartSummary } from "./cart-summary";

/** The full Cart page: lines on the left, totals beside them from lg up. */
export function CartPageBody({ initial }: { initial: CartView }) {
  // The store takes over once CartSync hands it this same view.
  const view = useCart((s) => s.view) ?? initial;
  if (view.lines.length === 0) return <EmptyCart />;
  const canCheckout = view.priced.lines.length > 0;
  return (
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="md:max-w-2xl">
        <CartLines view={view} />
      </div>
      <aside
        aria-label="Order summary"
        className="rounded-card border-border bg-card grid gap-4 border p-6 lg:sticky lg:top-28"
      >
        <CartSummary priced={view.priced} size="page" />
        <CartNotes priced={view.priced} />
        <Link
          href="/checkout"
          aria-disabled={!canCheckout}
          className={`${PRIMARY_BUTTON} w-full ${canCheckout ? "" : "pointer-events-none opacity-50"}`}
        >
          Checkout, {formatMoney(view.priced.totalCents)}
        </Link>
      </aside>
    </div>
  );
}
