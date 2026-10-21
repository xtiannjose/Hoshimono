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
  /** What stands in for the pieces not found (ADR 0010); weighed lines have none. */
  substitute?: {
    quantity: number;
    unitPriceCents: number;
    /** Accepted, or its Substitution Window ended without an answer. */
    accepted: boolean;
  } | null;
};

/**
 * The Final Total of a picked Order (ADR 0008): each line by what was
 * packed, never above its checkout amount, so a heavier pack is on us. The
 * delivery fee and discount stay as charged. An accepted substitute costs
 * the lower of its price and the ordered price (ADR 0010).
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
    const qty = Math.min(line.fulfilledQty ?? line.orderedQty, line.orderedQty);
    const found = prorate(line.lineTotalCents, qty, line.orderedQty);
    const sub = line.substitute;
    if (!sub?.accepted) return found;
    // The lower price per unit (ADR 0010), for no more than was missing.
    const orderedUnit = line.lineTotalCents / line.orderedQty;
    const units = Math.min(sub.quantity, line.orderedQty - qty);
    return found + Math.min(sub.unitPriceCents, orderedUnit) * units;
  });
  return addMoney(deliveryFeeCents, ...charged) - discountCents;
}
