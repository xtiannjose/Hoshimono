"use client";

import Link from "@/components/link";

import { Motion } from "@/components/motion";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { useMessages } from "@/i18n/client";
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
  const t = useMessages().cart;
  const totals = new Map(
    view.priced.lines.map((l) => [l.productId, l.lineTotalCents])
  );
  return (
    <>
      {view.unavailableCount > 0 && (
        <p className="rounded-field bg-muted mt-2 px-3 py-2 text-[13px] leading-[18px]">
          {t.unavailable(view.unavailableCount)}
        </p>
      )}
      {/* Cart Lines carry steppers, which animate. */}
      <Motion>
        <ul aria-label={t.itemsInCart}>
          {view.lines.map((line) => (
            <CartLine
              key={line.product.id}
              line={line}
              lineTotalCents={totals.get(line.product.id) ?? null}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </Motion>
    </>
  );
}

export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  const t = useMessages().cart;
  return (
    <div className="grid justify-items-start gap-3 py-8">
      <p className="type-h3">{t.empty}</p>
      <p className="text-muted-foreground">{t.emptyHint}</p>
      <Link href="/" onClick={onNavigate} className={PRIMARY_BUTTON}>
        {t.startShopping}
      </Link>
    </div>
  );
}
