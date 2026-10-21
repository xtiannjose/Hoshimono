import { addMoney, prorate } from "@/lib/money";

/** A Voucher as priceCart applies it, after the Customer checks (ADR 0015). */
export type VoucherTerms = {
  code: string;
  kind: "percent" | "amount" | "free_delivery";
  /** Percent, centavos off, or 0 for free delivery. */
  value: number;
  maxDiscountCents: number | null;
  /** On the goods after Promotions. */
  minSpendCents: number;
};

/**
 * Share an Order discount over lines in proportion to their totals, so VAT
 * falls on what is paid; the rounding centavo goes to the largest line
 * (ADR 0007).
 */
export function spreadDiscount(
  amounts: number[],
  discountCents: number
): number[] {
  const total = addMoney(0, ...amounts);
  if (discountCents < 0 || discountCents > total)
    throw new RangeError(
      `A discount of ${discountCents} does not fit goods of ${total}`
    );
  if (discountCents === 0 || total === 0) return amounts.map(() => 0);
  const shares = amounts.map((a) => prorate(a, discountCents, total));
  const off = discountCents - addMoney(0, ...shares);
  if (off !== 0) {
    const largest = amounts.indexOf(Math.max(...amounts));
    shares[largest] += off;
  }
  return shares;
}

/** What a percent or peso Voucher takes off these goods; 0 for free delivery. */
export function voucherDiscount(
  voucher: VoucherTerms,
  goodsCents: number
): number {
  if (voucher.kind === "free_delivery") return 0;
  const raw =
    voucher.kind === "percent"
      ? prorate(goodsCents, voucher.value, 100)
      : voucher.value;
  const capped =
    voucher.maxDiscountCents === null
      ? raw
      : Math.min(raw, voucher.maxDiscountCents);
  return Math.min(capped, goodsCents);
}
