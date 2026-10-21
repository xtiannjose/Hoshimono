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
  const fee = priced.deliveryFeeCents;
  const estimated = priced.weighedSubtotalCents > 0 || fee === null;
  return (
    <dl className="grid gap-2 tabular-nums">
      <div className="flex justify-between gap-3">
        <dt>Subtotal</dt>
        <dd>{formatMoney(priced.subtotalCents)}</dd>
      </div>
      {priced.discountCents > 0 && (
        <div className="flex justify-between gap-3 font-semibold">
          <dt>
            {priced.voucher ? `Voucher ${priced.voucher.code}` : "Discount"}
          </dt>
          <dd>-{formatMoney(priced.discountCents)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <dt>Delivery</dt>
        <dd>
          {fee === null ? "At checkout" : fee === 0 ? "Free" : formatMoney(fee)}
        </dd>
      </div>
      <div
        className={`border-border font-display flex justify-between gap-3 border-t pt-2 font-semibold tracking-[-0.02em] ${size === "page" ? "text-2xl leading-[30px]" : "text-xl leading-[26px]"}`}
      >
        <dt>{estimated ? "Estimated total" : "Total"}</dt>
        <dd>{formatMoney(priced.totalCents)}</dd>
      </div>
    </dl>
  );
}

/** Plain-language notes under the totals: minimum, free delivery, weights. */
export function CartNotes({ priced }: { priced: PricedCart }) {
  const notes: string[] = [];
  if (priced.belowMinimumByCents > 0) {
    notes.push(
      `Add ${formatMoney(priced.belowMinimumByCents)} more to reach the minimum order.`
    );
  } else if (priced.freeDeliveryRemainingCents) {
    notes.push(
      `Add ${formatMoney(priced.freeDeliveryRemainingCents)} more for free delivery.`
    );
  }
  if (priced.deliveryFeeCents === null) {
    notes.push("We show the delivery fee once we know your address.");
  }
  if (priced.weighedSubtotalCents > 0) {
    notes.push(
      "Weighed items are charged by their actual weight, so your final total may change a little."
    );
  }
  if (notes.length === 0) return null;
  return (
    <div className="text-muted-foreground grid gap-1 text-[13px] leading-[18px]">
      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </div>
  );
}
