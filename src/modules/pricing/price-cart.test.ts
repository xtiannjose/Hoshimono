import { describe, expect, it } from "vitest";

import { priceCart, type PriceLine } from "@/modules/pricing";

const ZONE = {
  deliveryFeeCents: 4900,
  freeDeliveryOverCents: 150000,
  minOrderCents: 50000,
};

const line = (over: Partial<PriceLine>): PriceLine => ({
  productId: "p",
  quantity: 1,
  unitPriceCents: 10000,
  taxClass: "vatable",
  isWeighed: false,
  ...over,
});

describe("priceCart", () => {
  it("totals lines, VAT and the delivery fee to the centavo", () => {
    const priced = priceCart(
      [
        line({
          productId: "rice",
          quantity: 2,
          unitPriceCents: 5900,
          taxClass: "vat_exempt",
        }),
        line({
          productId: "milk",
          quantity: 1,
          unitPriceCents: 11500,
          taxClass: "vatable",
        }),
      ],
      { zone: ZONE }
    );
    expect(priced.lines).toEqual([
      {
        productId: "rice",
        quantity: 2,
        unitPriceCents: 5900,
        lineTotalCents: 11800,
        discountCents: 0,
        vatCents: 0,
      },
      // 11500 x 12/112 = 1232.14
      {
        productId: "milk",
        quantity: 1,
        unitPriceCents: 11500,
        lineTotalCents: 11500,
        discountCents: 0,
        vatCents: 1232,
      },
    ]);
    expect(priced).toMatchObject({
      subtotalCents: 23300,
      discountCents: 0,
      deliveryFeeCents: 4900,
      // line VAT 1232 + delivery VAT 4900 x 12/112 = 525
      vatCents: 1757,
      totalCents: 28200,
    });
  });

  it("rounds VAT per line, half up, then sums (ADR 0002)", () => {
    const three = priceCart(
      [
        line({ productId: "a", unitPriceCents: 100 }),
        line({ productId: "b", unitPriceCents: 100 }),
        line({ productId: "c", unitPriceCents: 100 }),
      ],
      { zone: null }
    );
    // 10.71 each rounds to 11; on the total it would be 32.14
    expect(three.vatCents).toBe(33);
    // 14 x 12/112 = 1.5 exactly: half up
    expect(
      priceCart([line({ unitPriceCents: 14 })], { zone: null }).vatCents
    ).toBe(2);
  });

  it("makes delivery free at the Zone threshold and says how far off it is", () => {
    const short = priceCart([line({ unitPriceCents: 120000 })], { zone: ZONE });
    expect(short.deliveryFeeCents).toBe(4900);
    expect(short.freeDeliveryRemainingCents).toBe(30000);

    const exact = priceCart([line({ unitPriceCents: 150000 })], { zone: ZONE });
    expect(exact.deliveryFeeCents).toBe(0);
    expect(exact.freeDeliveryRemainingCents).toBe(0);
    expect(exact.totalCents).toBe(150000);

    const never = priceCart([line({ unitPriceCents: 900000 })], {
      zone: { ...ZONE, freeDeliveryOverCents: null },
    });
    expect(never.deliveryFeeCents).toBe(4900);
    expect(never.freeDeliveryRemainingCents).toBeNull();
  });

  it("reports how far below the Zone minimum the Cart is", () => {
    expect(
      priceCart([line({ unitPriceCents: 40000 })], { zone: ZONE })
        .belowMinimumByCents
    ).toBe(10000);
    expect(
      priceCart([line({ unitPriceCents: 50000 })], { zone: ZONE })
        .belowMinimumByCents
    ).toBe(0);
    expect(priceCart([], { zone: ZONE }).belowMinimumByCents).toBe(50000);
  });

  it("leaves delivery unknown until a Zone is known", () => {
    const priced = priceCart([line({ unitPriceCents: 10000 })], { zone: null });
    expect(priced.deliveryFeeCents).toBeNull();
    expect(priced.totalCents).toBe(10000);
    expect(priced.belowMinimumByCents).toBe(0);
  });

  it("totals Weighed Products separately for the weight note", () => {
    const priced = priceCart(
      [
        line({
          productId: "pork",
          unitPriceCents: 19500,
          isWeighed: true,
          taxClass: "vat_exempt",
        }),
        line({ productId: "milk", unitPriceCents: 11500 }),
      ],
      { zone: null }
    );
    expect(priced.weighedSubtotalCents).toBe(19500);
  });

  it("charges no delivery when nothing in the Cart can be sold", () => {
    const empty = priceCart([], { zone: ZONE });
    expect(empty).toMatchObject({
      deliveryFeeCents: 0,
      totalCents: 0,
      vatCents: 0,
    });
    expect(empty.freeDeliveryRemainingCents).toBe(150000);
  });

  it("splits sales by tax class for the receipt, the fee counted as vatable", () => {
    const priced = priceCart(
      [
        line({ productId: "milk", unitPriceCents: 11500, taxClass: "vatable" }),
        line({
          productId: "pork",
          unitPriceCents: 19500,
          taxClass: "vat_exempt",
        }),
        line({
          productId: "export",
          unitPriceCents: 3000,
          taxClass: "zero_rated",
        }),
      ],
      { zone: ZONE }
    );
    expect(priced).toMatchObject({
      vatableSalesCents: 11500 + 4900,
      vatExemptSalesCents: 19500,
      zeroRatedSalesCents: 3000,
    });
    expect(
      priced.vatableSalesCents +
        priced.vatExemptSalesCents +
        priced.zeroRatedSalesCents
    ).toBe(priced.totalCents);
  });

  it("refuses quantities and prices a Cart can never hold", () => {
    for (const bad of [
      { quantity: 0 },
      { quantity: -1 },
      { quantity: 1.5 },
      { quantity: 100 },
      { unitPriceCents: -1 },
      { unitPriceCents: 1.5 },
    ]) {
      expect(
        () => priceCart([line(bad)], { zone: null }),
        JSON.stringify(bad)
      ).toThrow(RangeError);
    }
  });
});
