"use client";

import { useMessages } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import type { PricedCart } from "@/modules/pricing";

/** Subtotal, delivery and total, all from priceCart (CRT-5). */
export function CartSummary({
  priced,
  size = "drawer",
}: {
  priced: PricedCart;
  size?: "drawer" | "page";
}) {
  const t = useMessages().cart;
  const fee = priced.deliveryFeeCents;
  const estimated = priced.weighedSubtotalCents > 0 || fee === null;
  return (
    <dl className="grid gap-2 tabular-nums">
      <div className="flex justify-between gap-3">
        <dt>{t.subtotal}</dt>
        <dd>{formatMoney(priced.subtotalCents)}</dd>
      </div>
      {priced.discountCents > 0 && (
        <div className="flex justify-between gap-3 font-semibold">
          <dt>
            {priced.voucher ? t.voucherLine(priced.voucher.code) : t.discount}
          </dt>
          <dd>-{formatMoney(priced.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt>{t.delivery}</dt>
        <dd>
          {fee === null ? t.atCheckout : fee === 0 ? t.free : formatMoney(fee)}
        </dd>
      </div>
      <div
        className={`border-border font-display flex justify-between gap-3 border-t pt-2 font-semibold tracking-[-0.02em] ${size === "page" ? "text-2xl leading-[30px]" : "text-xl leading-[26px]"}`}
      >
        <dt>{estimated ? t.estimatedTotal : t.total}</dt>
        <dd>{formatMoney(priced.totalCents)}</dd>
      </div>
    </dl>
  );
}

/** Plain-language notes under the totals: minimum, free delivery, weights. */
export function CartNotes({ priced }: { priced: PricedCart }) {
  const t = useMessages().cart;
  const notes: string[] = [];
  if (priced.belowMinimumByCents > 0) {
    notes.push(t.belowMinimum(formatMoney(priced.belowMinimumByCents)));
  } else if (priced.freeDeliveryRemainingCents) {
    notes.push(
      t.freeDeliveryIn(formatMoney(priced.freeDeliveryRemainingCents))
    );
  }
  if (priced.deliveryFeeCents === null) notes.push(t.feeLater);
  if (priced.weighedSubtotalCents > 0) notes.push(t.weighedNote);
  if (notes.length === 0) return null;
  return (
    <div className="text-muted-foreground grid gap-1 text-[13px] leading-[18px]">
      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </div>
  );
}
