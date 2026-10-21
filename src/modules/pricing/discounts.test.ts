import { describe, expect, it } from "vitest";

import {
  priceCart,
  promotedPrice,
  spreadDiscount,
  type PriceLine,
  type PromotionRule,
  type VoucherTerms,
} from "@/modules/pricing";

// ADR 0007 and ADR 0015: Promotions change the shelf price; a Voucher is a
// discount spread over the lines before VAT, or free delivery.

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

const voucher = (over: Partial<VoucherTerms>): VoucherTerms => ({
  code: "SAVE10",
  kind: "percent",
  value: 10,
  maxDiscountCents: null,
  minSpendCents: 0,
  ...over,
});

describe("spreadDiscount", () => {
  it("shares a discount by line totals; the rounding centavo goes to the largest line", () => {
    expect(spreadDiscount([10000, 5000, 2500], 1000)).toEqual([571, 286, 143]);
    expect(spreadDiscount([3333, 3333, 3334], 100)).toEqual([33, 33, 34]);
    expect(spreadDiscount([100, 200], 1)).toEqual([0, 1]);
    expect(spreadDiscount([5000, 5000], 0)).toEqual([0, 0]);
  });

  it("never takes more than a line is worth", () => {
    expect(() => spreadDiscount([1000], 1001)).toThrow(RangeError);
  });
});

describe("priceCart with a Voucher", () => {
  const cart = [
    line({ productId: "milk", unitPriceCents: 20000 }),
    line({ productId: "rice", unitPriceCents: 40000, taxClass: "vat_exempt" }),
  ];

  it("takes a percent off the goods, before VAT, and not off the fee", () => {
    const priced = priceCart(cart, { zone: ZONE, voucher: voucher({}) });
    expect(priced.discountCents).toBe(6000);
    expect(priced.lines.map((l) => l.discountCents)).toEqual([2000, 4000]);
    // VAT falls on what is paid for the milk: 18000 x 12/112.
    expect(priced.lines[0].vatCents).toBe(1929);
    expect(priced.deliveryFeeCents).toBe(4900);
    expect(priced.totalCents).toBe(60000 - 6000 + 4900);
    expect(priced.vatableSalesCents).toBe(18000 + 4900);
    expect(priced.vatExemptSalesCents).toBe(36000);
    expect(priced.voucher).toEqual({
      code: "SAVE10",
      applied: true,
      discountCents: 6000,
      freeDelivery: false,
      shortByCents: 0,
    });
  });

  it("caps a percent at its most, and a peso amount at the goods", () => {
    expect(
      priceCart(cart, {
        zone: ZONE,
        voucher: voucher({ maxDiscountCents: 5000 }),
      }).discountCents
    ).toBe(5000);
    expect(
      priceCart([line({ unitPriceCents: 8000 })], {
        zone: ZONE,
        voucher: voucher({ kind: "amount", value: 10000 }),
      }).discountCents
    ).toBe(8000);
  });

  it("makes delivery free without calling it a discount", () => {
    const priced = priceCart(cart, {
      zone: ZONE,
      voucher: voucher({ kind: "free_delivery", value: 0 }),
    });
    expect(priced.discountCents).toBe(0);
    expect(priced.deliveryFeeCents).toBe(0);
    expect(priced.totalCents).toBe(60000);
    expect(priced.voucher?.freeDelivery).toBe(true);
  });

  it("applies nothing under the minimum spend, and says how far off it is", () => {
    const priced = priceCart(cart, {
      zone: ZONE,
      voucher: voucher({ minSpendCents: 80000 }),
    });
    expect(priced.discountCents).toBe(0);
    expect(priced.voucher).toMatchObject({
      applied: false,
      shortByCents: 20000,
    });
  });

  it("judges the Order Minimum and free delivery before the Voucher", () => {
    const priced = priceCart([line({ unitPriceCents: 150000 })], {
      zone: ZONE,
      voucher: voucher({}),
    });
    expect(priced.deliveryFeeCents).toBe(0);
    expect(priced.belowMinimumByCents).toBe(0);
    expect(priced.totalCents).toBe(135000);
  });

  it("prices exactly as before without a Voucher", () => {
    const priced = priceCart(cart, { zone: ZONE });
    expect(priced.discountCents).toBe(0);
    expect(priced.voucher).toBeNull();
    expect(priced.lines.map((l) => l.discountCents)).toEqual([0, 0]);
  });
});

describe("promotedPrice", () => {
  const promo = (over: Partial<PromotionRule>): PromotionRule => ({
    id: "p1",
    name: "Dairy week",
    kind: "percent",
    value: 10,
    productIds: [],
    categoryIds: ["dairy"],
    ...over,
  });

  it("takes a percent or a peso amount off each unit for matching Products", () => {
    const milk = { id: "milk", categoryIds: ["milk", "dairy"] };
    expect(promotedPrice(milk, 11500, [promo({})])).toEqual({
      priceCents: 10350,
      promotionId: "p1",
      name: "Dairy week",
    });
    expect(
      promotedPrice(milk, 11500, [
        promo({
          kind: "amount",
          value: 2000,
          categoryIds: [],
          productIds: ["milk"],
        }),
      ])?.priceCents
    ).toBe(9500);
    expect(
      promotedPrice({ id: "rice", categoryIds: ["rice"] }, 5000, [promo({})])
    ).toBeNull();
  });

  it("gives the lower price when two Promotions match, and never below zero", () => {
    const milk = { id: "milk", categoryIds: ["dairy"] };
    expect(
      promotedPrice(milk, 11500, [
        promo({}),
        promo({ id: "p2", name: "Milk deal", kind: "amount", value: 3000 }),
      ])
    ).toEqual({ priceCents: 8500, promotionId: "p2", name: "Milk deal" });
    expect(
      promotedPrice(milk, 1000, [promo({ kind: "amount", value: 5000 })])
        ?.priceCents
    ).toBe(0);
  });
});
