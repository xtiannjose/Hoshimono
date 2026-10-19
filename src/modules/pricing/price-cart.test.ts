// priceCart at the pricing module's public interface. Expected amounts are
// worked by hand from the rules in docs/adr/0006-pricing-vat-and-thresholds.md.
import { describe, expect, it } from "vitest";

import { priceCart } from ".";

// Pasig and Mandaluyong in the seed (ADR 0006 rule 12).
const PASIG = {
  deliveryFeeCents: 4900,
  freeDeliveryOverCents: 150000,
  minOrderCents: 50000,
};

describe("priceCart", () => {
  it("adds the Zone's Delivery Fee to a Cart under the Free-Delivery Threshold", () => {
    const cart = priceCart(
      [
        {
          productId: "pork-belly",
          priceCents: 19500,
          quantity: 3,
          taxClass: "vat_exempt",
        },
      ],
      PASIG
    );
    expect(cart.subtotalCents).toBe(58500);
    expect(cart.deliveryFeeCents).toBe(4900);
    expect(cart.totalCents).toBe(63400);
  });

  it("waives the Delivery Fee at or above the Free-Delivery Threshold", () => {
    const at = priceCart([line("rice", 75000, 2)], PASIG);
    expect(at.deliveryFeeCents).toBe(0);
    expect(at.totalCents).toBe(150000);

    const below = priceCart([line("rice", 149999, 1)], PASIG);
    expect(below.deliveryFeeCents).toBe(4900);
    expect(below.totalCents).toBe(154899);
  });

  it("takes 12/112 VAT out of vatable lines and the Delivery Fee, never adding it", () => {
    const cart = priceCart(
      [
        line("milo", 19500, 2, "vatable"),
        line("pork-belly", 19500, 1),
        line("tomatoes", 6000, 1),
      ],
      PASIG
    );
    // Milo 390.00 holds 41.79 VAT (41.7857 rounded); the 49.00 fee holds 5.25.
    expect(
      cart.lines.map((l) => [l.productId, l.lineTotalCents, l.vatCents])
    ).toEqual([
      ["milo", 39000, 4179],
      ["pork-belly", 19500, 0],
      ["tomatoes", 6000, 0],
    ]);
    expect(cart.vat.vatCents).toBe(4704);
    expect(cart.totalCents).toBe(69400);
  });

  it("rounds VAT once per line, then adds the lines (ADR 0002)", () => {
    // 14.14 holds 1.515 VAT, so each line rounds up to 1.52: 3.04 in all.
    // Rounding the 28.28 total once would give 3.03.
    const cart = priceCart(
      [line("a", 1414, 1, "vatable"), line("b", 1414, 1, "vatable")],
      PASIG
    );
    expect(cart.lines.map((l) => l.vatCents)).toEqual([152, 152]);
    expect(cart.vat.vatCents).toBe(304 + 525);
  });

  it("splits the total into the four receipt figures, to the centavo", () => {
    const cart = priceCart(
      [
        line("milo", 19500, 2, "vatable"),
        line("pork-belly", 19500, 1),
        line("tomatoes", 6000, 1),
        line("zero-rated-item", 10000, 1, "zero_rated"),
      ],
      PASIG
    );
    expect(cart.vat).toEqual({
      // Milo 390.00 - 41.79 VAT, plus the 49.00 fee - 5.25 VAT.
      vatableSalesCents: 39196,
      vatExemptSalesCents: 25500,
      zeroRatedSalesCents: 10000,
      vatCents: 4704,
    });
    expect(cart.totalCents).toBe(79400);
  });

  it("says how far a Cart is below the Order Minimum, ignoring the Delivery Fee", () => {
    // 480.00 of items plus the 49.00 fee is over 500.00, but the fee does not count.
    const below = priceCart([line("rice", 24000, 2)], PASIG);
    expect(below.orderMinimumShortfallCents).toBe(2000);

    expect(
      priceCart([line("rice", 25000, 2)], PASIG).orderMinimumShortfallCents
    ).toBe(0);
  });

  it("charges nothing for an empty Cart", () => {
    const cart = priceCart([], PASIG);
    expect(cart.deliveryFeeCents).toBe(0);
    expect(cart.totalCents).toBe(0);
    expect(cart.vat.vatCents).toBe(0);
    expect(cart.orderMinimumShortfallCents).toBe(50000);
  });

  it("applies no discount until Promotions and Vouchers arrive in Phase 5", () => {
    const cart = priceCart([line("milo", 19500, 2, "vatable")], PASIG);
    expect(cart.discountCents).toBe(0);
    expect(cart.totalCents).toBe(43900);
  });

  it("refuses quantities and prices that cannot be real", () => {
    for (const bad of [
      line("rice", 25000, 0),
      line("rice", 25000, -1),
      line("rice", 25000, 1.5),
      line("rice", -100, 1),
      line("rice", 19.5, 2),
    ]) {
      expect(() => priceCart([bad], PASIG), JSON.stringify(bad)).toThrow(
        RangeError
      );
    }
  });
});

function line(
  productId: string,
  priceCents: number,
  quantity: number,
  taxClass: "vatable" | "vat_exempt" | "zero_rated" = "vat_exempt"
) {
  return { productId, priceCents, quantity, taxClass };
}
