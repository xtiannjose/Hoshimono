import { addMoney, prorate } from "@/lib/money";

export type TaxClass = "vatable" | "vat_exempt" | "zero_rated";

/** One Cart Line as priced today. */
export type PricingLine = {
  productId: string;
  /** Current price of one unit; for a Weighed Product, its estimated weight. */
  priceCents: number;
  quantity: number;
  taxClass: TaxClass;
};

/** A Zone's fee rules, as stored on the Zone. */
export type ZoneFees = {
  deliveryFeeCents: number;
  freeDeliveryOverCents: number;
  minOrderCents: number;
};

export type PricedLine = {
  productId: string;
  lineTotalCents: number;
  /** VAT included in the line total, for the Order Line snapshot. */
  vatCents: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  /** Always 0 until Promotions and Vouchers arrive in Phase 5 (ADR 0006 rule 9). */
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  /** How much more the Cart needs to reach the Order Minimum; 0 when met. */
  orderMinimumShortfallCents: number;
  /** Receipt figures; they always add up to totalCents (ADR 0006 rule 6). */
  vat: {
    /** Vatable lines and the Delivery Fee, net of VAT. */
    vatableSalesCents: number;
    vatExemptSalesCents: number;
    zeroRatedSalesCents: number;
    vatCents: number;
  };
};

/** VAT inside a VAT-inclusive amount: 12/112, rounded once (ADR 0006 rule 4). */
function vatIn(cents: number): number {
  return prorate(cents, 12, 112);
}

export function priceCart(
  lines: readonly PricingLine[],
  zone: ZoneFees
): PricedCart {
  const priced = lines.map((l) => {
    if (!Number.isSafeInteger(l.quantity) || l.quantity < 1) {
      throw new RangeError(
        `Quantity must be a whole number from 1: ${l.quantity}`
      );
    }
    if (!Number.isSafeInteger(l.priceCents) || l.priceCents < 0) {
      throw new RangeError(
        `Price must be whole centavos from 0: ${l.priceCents}`
      );
    }
    const lineTotalCents = l.priceCents * l.quantity;
    return {
      productId: l.productId,
      lineTotalCents,
      vatCents: l.taxClass === "vatable" ? vatIn(lineTotalCents) : 0,
    };
  });
  const subtotalCents = addMoney(...priced.map((l) => l.lineTotalCents));
  // At or above the threshold, despite the column name (ADR 0006 rule 11).
  // An empty Cart has nothing to deliver.
  const deliveryFeeCents =
    lines.length === 0 || subtotalCents >= zone.freeDeliveryOverCents
      ? 0
      : zone.deliveryFeeCents;
  const salesOf = (taxClass: TaxClass) =>
    addMoney(
      ...priced
        .filter((_, i) => lines[i].taxClass === taxClass)
        .map((l) => l.lineTotalCents)
    );
  // The Delivery Fee is a vatable service (ADR 0006 rule 5).
  const vatableGrossCents = addMoney(salesOf("vatable"), deliveryFeeCents);
  const vatCents = addMoney(
    ...priced.map((l) => l.vatCents),
    vatIn(deliveryFeeCents)
  );
  return {
    lines: priced,
    subtotalCents,
    discountCents: 0,
    deliveryFeeCents,
    totalCents: addMoney(subtotalCents, deliveryFeeCents),
    orderMinimumShortfallCents: Math.max(0, zone.minOrderCents - subtotalCents),
    vat: {
      vatableSalesCents: vatableGrossCents - vatCents,
      vatExemptSalesCents: salesOf("vat_exempt"),
      zeroRatedSalesCents: salesOf("zero_rated"),
      vatCents,
    },
  };
}
