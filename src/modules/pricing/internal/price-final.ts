import { addMoney, prorate } from "@/lib/money";

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
};

/**
 * The Final Total of a picked Order (ADR 0008): each line by what was
 * packed, never above its checkout amount, so a heavier pack is on us. The
 * delivery fee and discount stay as charged.
 */
export function priceFinal(
  lines: PickedLine[],
  {
    deliveryFeeCents,
    discountCents,
  }: { deliveryFeeCents: number; discountCents: number }
): number {
  const charged = lines.map((line) => {
    if (line.orderedWeightGrams !== null) {
      const grams = line.finalWeightGrams ?? line.orderedWeightGrams;
      return prorate(
        line.lineTotalCents,
        Math.min(grams, line.orderedWeightGrams),
        line.orderedWeightGrams
      );
    }
    const qty = line.fulfilledQty ?? line.orderedQty;
    return prorate(
      line.lineTotalCents,
      Math.min(qty, line.orderedQty),
      line.orderedQty
    );
  });
  return addMoney(deliveryFeeCents, ...charged) - discountCents;
}
