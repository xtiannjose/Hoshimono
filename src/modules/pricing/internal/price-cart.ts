import type { TaxClass } from "@/generated/prisma/enums";
import { MAX_LINE_QUANTITY } from "@/lib/cart-limits";
import { addMoney, prorate } from "@/lib/money";

import {
  spreadDiscount,
  voucherDiscount,
  type VoucherTerms,
} from "./discounts";

export { MAX_LINE_QUANTITY };

/**
 * One Cart line at the current price. For a Weighed Product the price is
 * for its estimated pack weight, so quantity times price is the estimate;
 * the final amount comes from the weight entered at pick.
 */
export type PriceLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  taxClass: TaxClass;
  isWeighed: boolean;
};

/** A Zone's fee rules (docs/04-DATA-MODEL.md, zones). */
export type ZoneFees = {
  deliveryFeeCents: number;
  freeDeliveryOverCents: number | null;
  minOrderCents: number;
};

export type PriceContext = {
  /** null until the Customer gives an Address, so delivery is not known yet. */
  zone: ZoneFees | null;
  /** The Cart's Voucher, once the Customer may use it (ADR 0015). */
  voucher?: VoucherTerms | null;
};

/** How the Cart's Voucher came out. */
export type AppliedVoucher = {
  code: string;
  /** False while the goods are under its minimum spend. */
  applied: boolean;
  discountCents: number;
  freeDelivery: boolean;
  /** How much more to spend for it to apply. */
  shortByCents: number;
};

export type PricedLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  /** This line's share of the Voucher discount (ADR 0007). */
  discountCents: number;
  /** VAT inside what is paid for the line, after its discount. */
  vatCents: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  /** null while the Zone is unknown. */
  deliveryFeeCents: number | null;
  /** VAT already inside the prices and the fee, for receipts; never added on top. */
  vatCents: number;
  /**
   * Sales by tax class for a Philippine receipt (VATable, VAT-exempt and
   * zero-rated). The delivery fee counts as VATable. They sum to the total.
   */
  vatableSalesCents: number;
  vatExemptSalesCents: number;
  zeroRatedSalesCents: number;
  totalCents: number;
  /** Estimate of the Weighed Products, for the weight note. */
  weighedSubtotalCents: number;
  /** 0 once the Zone minimum is met; also 0 while the Zone is unknown. */
  belowMinimumByCents: number;
  /** null when the Zone is unknown or never delivers free. */
  freeDeliveryRemainingCents: number | null;
  /** null without a Voucher. */
  voucher: AppliedVoucher | null;
};

// Prices include 12% VAT, so the VAT inside a vatable amount is 12/112 of it.
function vatIn(cents: number, taxClass: TaxClass): number {
  return taxClass === "vatable" ? prorate(cents, 12, 112) : 0;
}

function assertLine(line: PriceLine): void {
  const { quantity, unitPriceCents } = line;
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_LINE_QUANTITY
  ) {
    throw new RangeError(
      `Quantity must be 1 to ${MAX_LINE_QUANTITY}: ${quantity}`
    );
  }
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new RangeError(`Not a price in centavos: ${unitPriceCents}`);
  }
}

/**
 * The one place a total is computed (docs/03-ARCHITECTURE.md section 5).
 * Pure: the caller loads current prices (Promotions are already in them),
 * the Zone and a Voucher the Customer may use. VAT is rounded half up per
 * line, on what is paid after the Voucher, then summed (ADR 0002, 0007).
 */
export function priceCart(
  lines: PriceLine[],
  context: PriceContext
): PricedCart {
  const totals = lines.map((line) => {
    assertLine(line);
    return line.unitPriceCents * line.quantity;
  });
  const subtotalCents = addMoney(0, ...totals);
  // The Order Minimum and free delivery are judged before the Voucher.
  const goodsCents = subtotalCents;

  const voucher = context.voucher ?? null;
  const shortByCents = voucher
    ? Math.max(0, voucher.minSpendCents - goodsCents)
    : 0;
  const applied = voucher !== null && shortByCents === 0 && lines.length > 0;
  const discountCents = applied ? voucherDiscount(voucher, goodsCents) : 0;
  const shares = spreadDiscount(totals, discountCents);
  const priced = lines.map((line, i): PricedLine => ({
    productId: line.productId,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: totals[i],
    discountCents: shares[i],
    vatCents: vatIn(totals[i] - shares[i], line.taxClass),
  }));
  const weighedSubtotalCents = addMoney(
    0,
    ...priced.filter((_, i) => lines[i].isWeighed).map((l) => l.lineTotalCents)
  );

  const zone = context.zone;
  const freeOver = zone?.freeDeliveryOverCents ?? null;
  const freeByVoucher = applied && voucher.kind === "free_delivery";
  const freeDelivery =
    (freeOver !== null && goodsCents >= freeOver) || freeByVoucher;
  // Nothing to deliver (every line sold out) means nothing to charge.
  const deliveryFeeCents = zone
    ? freeDelivery || priced.length === 0
      ? 0
      : zone.deliveryFeeCents
    : null;
  const salesOf = (taxClass: TaxClass) =>
    addMoney(
      0,
      ...priced
        .filter((_, i) => lines[i].taxClass === taxClass)
        .map((l) => l.lineTotalCents - l.discountCents)
    );
  // Delivery is a service sold by a VAT-registered seller, so the fee is vatable.
  const deliveryVat = deliveryFeeCents ? vatIn(deliveryFeeCents, "vatable") : 0;

  return {
    lines: priced,
    subtotalCents,
    discountCents,
    deliveryFeeCents,
    vatCents: addMoney(deliveryVat, ...priced.map((l) => l.vatCents)),
    vatableSalesCents: addMoney(salesOf("vatable"), deliveryFeeCents ?? 0),
    vatExemptSalesCents: salesOf("vat_exempt"),
    zeroRatedSalesCents: salesOf("zero_rated"),
    totalCents: addMoney(goodsCents - discountCents, deliveryFeeCents ?? 0),
    weighedSubtotalCents,
    belowMinimumByCents: zone
      ? Math.max(0, zone.minOrderCents - goodsCents)
      : 0,
    freeDeliveryRemainingCents:
      freeOver === null ? null : Math.max(0, freeOver - goodsCents),
    voucher: voucher && {
      code: voucher.code,
      applied,
      discountCents,
      freeDelivery: freeByVoucher,
      shortByCents,
    },
  };
}
