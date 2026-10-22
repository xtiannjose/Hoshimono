import { addMoney, prorate } from "@/lib/money";
import {
  chargedLine,
  spreadDiscount,
  type PickedLine,
} from "@/modules/pricing";

/**
 * What claiming `units` of one line is worth (ADR 0016): their share of what
 * the line was charged after picking, less that share of the Order's
 * discount, spread over the charged lines as ADR 0007 says.
 */
export function claimValue(
  order: { charged: number[]; discountCents: number },
  index: number,
  { units, chargedUnits }: { units: number; chargedUnits: number }
): number {
  if (chargedUnits <= 0) return 0;
  const goods = addMoney(0, ...order.charged);
  const shares = spreadDiscount(
    order.charged,
    Math.min(order.discountCents, goods)
  );
  return prorate(order.charged[index] - shares[index], units, chargedUnits);
}

export type ClaimLine = PickedLine & {
  substitute: NonNullable<PickedLine["substitute"]> | null;
};

/** Items a Customer can claim on a line: a weighed pack counts as one. */
export function chargedUnits(line: ClaimLine): number {
  if (line.orderedWeightGrams !== null) return chargedLine(line) > 0 ? 1 : 0;
  const found = Math.min(line.fulfilledQty ?? line.orderedQty, line.orderedQty);
  const sub = line.substitute?.accepted
    ? Math.min(line.substitute.quantity, line.orderedQty - found)
    : 0;
  return found + sub;
}
