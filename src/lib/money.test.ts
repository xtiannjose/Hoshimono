import { describe, expect, it } from "vitest";

import { addMoney, formatMoney, parseMoney, prorate } from "@/lib/money";

describe("formatMoney", () => {
  it("shows pesos with grouping and two decimals", () => {
    expect(formatMoney(124900)).toBe("₱1,249.00");
    expect(formatMoney(5900)).toBe("₱59.00");
    expect(formatMoney(100000000)).toBe("₱1,000,000.00");
  });

  it("keeps centavos visible, never dropped", () => {
    expect(formatMoney(0)).toBe("₱0.00");
    expect(formatMoney(5)).toBe("₱0.05");
    expect(formatMoney(10)).toBe("₱0.10");
  });

  it("puts the minus sign before the peso sign", () => {
    expect(formatMoney(-5000)).toBe("-₱50.00");
  });

  it("rejects anything that is not an integer number of centavos", () => {
    expect(() => formatMoney(59.5)).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN)).toThrow(RangeError);
  });
});

describe("parseMoney", () => {
  it("reads plain, grouped and peso-prefixed amounts into centavos", () => {
    expect(parseMoney("1249")).toBe(124900);
    expect(parseMoney("1,249.00")).toBe(124900);
    expect(parseMoney("₱1,249.00")).toBe(124900);
    expect(parseMoney("PHP 59.5")).toBe(5950);
    expect(parseMoney(" 59.05 ")).toBe(5905);
    expect(parseMoney("0.99")).toBe(99);
  });

  it("round-trips with formatMoney", () => {
    for (const cents of [0, 1, 99, 5900, 124900, 99999999]) {
      expect(parseMoney(formatMoney(cents))).toBe(cents);
    }
  });

  it("returns null instead of guessing on bad input", () => {
    for (const bad of [
      "",
      "abc",
      "59.999",
      "1.2.3",
      "1,24",
      "-5",
      "₱",
      "12 34",
    ]) {
      expect(parseMoney(bad), bad).toBeNull();
    }
  });
});

describe("addMoney", () => {
  it("sums centavos, including discounts as negatives", () => {
    expect(addMoney()).toBe(0);
    expect(addMoney(5900, 12500, -1000)).toBe(17400);
  });

  it("refuses floats so 0.1 + 0.2 style errors cannot enter", () => {
    expect(() => addMoney(0.1, 0.2)).toThrow(RangeError);
  });
});

describe("prorate", () => {
  it("scales centavos by a ratio, rounding half up once", () => {
    // ₱95.00 per kg, 1,250 g picked: ₱118.75
    expect(prorate(9500, 1250, 1000)).toBe(11875);
    // ₱115.00 per litre carton of 1,000 ml, shown per 100 ml: ₱11.50
    expect(prorate(11500, 100, 1000)).toBe(1150);
    // ₱42.00 for 360 ml, per litre: 116.666... rounds to ₱116.67
    expect(prorate(4200, 1000, 360)).toBe(11667);
    // exactly half a centavo rounds up
    expect(prorate(1, 1, 2)).toBe(1);
    expect(prorate(3, 1, 2)).toBe(2);
  });

  it("mirrors negatives, so a refund equals its charge", () => {
    expect(prorate(-9500, 1250, 1000)).toBe(-11875);
    expect(prorate(-3, 1, 2)).toBe(-2);
    expect(Object.is(prorate(-1, 1, 4), 0)).toBe(true);
  });

  it("rejects non-integers and a zero or negative denominator", () => {
    expect(() => prorate(95.5, 1, 2)).toThrow(RangeError);
    expect(() => prorate(9500, 1.5, 2)).toThrow(RangeError);
    expect(() => prorate(9500, 1, 0)).toThrow(RangeError);
    expect(() => prorate(9500, 1, -2)).toThrow(RangeError);
  });
});
