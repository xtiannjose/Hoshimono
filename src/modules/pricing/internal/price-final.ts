import type { TaxClass } from "@/generated/prisma/enums";
import { addMoney, prorate } from "@/lib/money";

import { spreadDiscount } from "./discounts";

/** An Order Line as picked: its checkout amount and what was packed. */
export type PickedLine = {
  /** The amount charged at checkout (the estimate for a Weighed Product). */
  lineTotalCents: number;
  orderedQty: number;
  /** Pieces picked; null until entered, counted as ordered. */
  fulfilledQty: number | null;
  /** Set for a Weighed Product: the weight the estimate was for. */
  orderedWeightGrams: number | null;
  /** The weight packed; null until entered, counted as ordered. */
  finalWeightGrams: number | null;
  /** What stands in for the pieces not found (ADR 0010); weighed lines have none. */
  substitute?: {
    quantity: number;
    unitPriceCents: number;
    /** Accepted, or its Substitution Window ended without an answer. */
    accepted: boolean;
  } | null;
};

/**
 * What one picked line is charged: by what was packed, never above its
 * checkout amount (ADR 0008), plus an accepted substitute at the lower of
 * its price and the ordered price (ADR 0010).
 */
export function chargedLine(line: PickedLine): number {
  if (line.orderedWeightGrams !== null) {
    const grams = line.finalWeightGrams ?? line.orderedWeightGrams;
    return prorate(
      line.lineTotalCents,
      Math.min(grams, line.orderedWeightGrams),
      line.orderedWeightGrams
    );
  }
  const qty = Math.min(line.fulfilledQty ?? line.orderedQty, line.orderedQty);
  const found = prorate(line.lineTotalCents, qty, line.orderedQty);
  const sub = line.substitute;
  if (!sub?.accepted) return found;
  // The lower price per unit, for no more than was missing.
  const orderedUnit = line.lineTotalCents / line.orderedQty;
  const units = Math.min(sub.quantity, line.orderedQty - qty);
  return found + Math.min(sub.unitPriceCents, orderedUnit) * units;
}

/**
 * The Final Total of a picked Order: each line as charged, with the
 * delivery fee and discount as charged at checkout. The discount never
 * takes off more than what was picked (ADR 0015).
 */
export function priceFinal(
  lines: PickedLine[],
  {
    deliveryFeeCents,
    discountCents,
  }: { deliveryFeeCents: number; discountCents: number }
): number {
  const goods = addMoney(0, ...lines.map(chargedLine));
  return addMoney(deliveryFeeCents, goods - Math.min(discountCents, goods));
}

// Prices include 12% VAT, so the VAT inside a vatable amount is 12/112 of it.
const vatIn = (cents: number, taxClass: TaxClass) =>
  taxClass === "vatable" ? prorate(cents, 12, 112) : 0;

/**
 * A Philippine receipt's split of what was charged (ADR 0012): sales by
 * tax class and the VAT inside, per line then summed (ADR 0002). The
 * delivery fee is vatable, as in priceCart. A Voucher discount is spread
 * over the lines before VAT (ADR 0007), never more than they come to.
 */
export function receiptBreakdown(
  items: { amountCents: number; taxClass: TaxClass }[],
  {
    deliveryFeeCents,
    discountCents,
  }: { deliveryFeeCents: number; discountCents: number }
) {
  const amounts = items.map((i) => i.amountCents);
  const goods = addMoney(0, ...amounts);
  const discount = Math.min(discountCents, goods);
  const shares = spreadDiscount(amounts, discount);
  const net = items.map((i, n) => ({
    taxClass: i.taxClass,
    amountCents: i.amountCents - shares[n],
  }));
  const salesOf = (taxClass: TaxClass) =>
    addMoney(
      0,
      ...net.filter((i) => i.taxClass === taxClass).map((i) => i.amountCents)
    );
  return {
    vatableSalesCents: addMoney(salesOf("vatable"), deliveryFeeCents),
    vatExemptSalesCents: salesOf("vat_exempt"),
    zeroRatedSalesCents: salesOf("zero_rated"),
    vatCents: addMoney(
      vatIn(deliveryFeeCents, "vatable"),
      ...net.map((i) => vatIn(i.amountCents, i.taxClass))
    ),
    totalCents: addMoney(deliveryFeeCents, goods - discount),
  };
}
