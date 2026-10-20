import { describe, expect, it } from "vitest";

import { priceFinal, type PickedLine } from "@/modules/pricing";

const piece = (over: Partial<PickedLine> = {}): PickedLine => ({
  lineTotalCents: 23000, // 2 x Fresh Milk at 115.00
  orderedQty: 2,
  fulfilledQty: null,
  orderedWeightGrams: null,
  finalWeightGrams: null,
  ...over,
});
const weighed = (over: Partial<PickedLine> = {}): PickedLine => ({
  lineTotalCents: 28500, // 1 kg of liempo at 285.00 per kg
  orderedQty: 2,
  fulfilledQty: null,
  orderedWeightGrams: 1000,
  finalWeightGrams: null,
  ...over,
});
const fees = { deliveryFeeCents: 4900, discountCents: 0 };

describe("priceFinal", () => {
  it("is the estimate when every line is picked as ordered", () => {
    expect(
      priceFinal(
        [piece({ fulfilledQty: 2 }), weighed({ finalWeightGrams: 1000 })],
        fees
      )
    ).toBe(23000 + 28500 + 4900);
    // Nothing entered yet counts as picked as ordered.
    expect(priceFinal([piece(), weighed()], fees)).toBe(23000 + 28500 + 4900);
  });

  it("charges a lighter pack by its weight, to the centavo", () => {
    // 930 g of 1000 g: 285.00 x 0.93 = 265.05
    expect(priceFinal([weighed({ finalWeightGrams: 930 })], fees)).toBe(
      26505 + 4900
    );
    // 333 g: 94.905 rounds half up to 94.91
    expect(priceFinal([weighed({ finalWeightGrams: 333 })], fees)).toBe(
      9491 + 4900
    );
  });

  it("never charges more than the estimate for a heavier pack", () => {
    expect(priceFinal([weighed({ finalWeightGrams: 1080 })], fees)).toBe(
      28500 + 4900
    );
  });

  it("charges only what was picked of a short line", () => {
    expect(
      priceFinal([piece({ fulfilledQty: 1 }), piece({ fulfilledQty: 0 })], fees)
    ).toBe(11500 + 0 + 4900);
  });

  it("keeps the delivery fee and takes off the discount", () => {
    expect(
      priceFinal([piece({ fulfilledQty: 1 })], {
        deliveryFeeCents: 0,
        discountCents: 1000,
      })
    ).toBe(11500 - 1000);
  });
});
