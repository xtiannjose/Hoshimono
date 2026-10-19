import type { TaxClass } from "@/generated/prisma/enums";
import { addMoney, prorate } from "@/lib/money";

/** The most of one Product a Cart line can hold (CRT-2 stepper limit). */
export const MAX_LINE_QUANTITY = 99;

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
};

export type PricedLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
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
  /** Estimate of the Weighed Products, for the card hold and the weight note. */
  weighedSubtotalCents: number;
  /** 0 once the Zone minimum is met; also 0 while the Zone is unknown. */
  belowMinimumByCents: number;
  /** null when the Zone is unknown or never delivers free. */
  freeDeliveryRemainingCents: number | null;
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
 * Pure: the caller loads current prices and the Zone. VAT is rounded half
 * up per line, then summed (ADR 0002).
 */
export function priceCart(
  lines: PriceLine[],
  context: PriceContext
): PricedCart {
  const priced = lines.map((line): PricedLine => {
    assertLine(line);
    const lineTotalCents = line.unitPriceCents * line.quantity;
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents,
      vatCents: vatIn(lineTotalCents, line.taxClass),
    };
  });

  const subtotalCents = addMoney(0, ...priced.map((l) => l.lineTotalCents));
  // shortcut: no Promotions or Vouchers until Phase 5; they reduce this.
  const discountCents = 0;
  const goodsCents = subtotalCents - discountCents;
  const weighedSubtotalCents = addMoney(
    0,
    ...priced.filter((_, i) => lines[i].isWeighed).map((l) => l.lineTotalCents)
  );

  const zone = context.zone;
  const freeOver = zone?.freeDeliveryOverCents ?? null;
  const freeDelivery = freeOver !== null && goodsCents >= freeOver;
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
        .map((l) => l.lineTotalCents)
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
    totalCents: addMoney(goodsCents, deliveryFeeCents ?? 0),
    weighedSubtotalCents,
    belowMinimumByCents: zone
      ? Math.max(0, zone.minOrderCents - goodsCents)
      : 0,
    freeDeliveryRemainingCents:
      freeOver === null ? null : Math.max(0, freeOver - goodsCents),
  };
}
