"use client";

import Link from "next/link";

import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import type { CartView } from "@/modules/cart";

import { CartLine } from "./cart-line";

/** The Cart Lines, shared by the drawer and the Cart page. */
export function CartLines({
  view,
  onNavigate,
}: {
  view: CartView;
  onNavigate?: () => void;
}) {
  const totals = new Map(
    view.priced.lines.map((l) => [l.productId, l.lineTotalCents])
  );
  return (
    <>
      {view.unavailableCount > 0 && (
        <p className="rounded-field bg-muted mt-2 px-3 py-2 text-[13px] leading-[18px]">
          {view.unavailableCount === 1
            ? "1 item in your cart is no longer sold, so we left it out."
            : `${view.unavailableCount} items in your cart are no longer sold, so we left them out.`}
        </p>
      )}
      <ul aria-label="Items in your cart">
        {view.lines.map((line) => (
          <CartLine
            key={line.product.id}
            line={line}
            lineTotalCents={totals.get(line.product.id) ?? null}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </>
  );
}

export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="grid justify-items-start gap-3 py-8">
      <p className="type-h3">Your cart is empty</p>
      <p className="text-muted-foreground">
        Start with today&apos;s fresh picks.
      </p>
      <Link href="/" onClick={onNavigate} className={PRIMARY_BUTTON}>
        Start shopping
      </Link>
    </div>
  );
}
