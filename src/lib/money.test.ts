import { describe, expect, it } from "vitest";

import { addMoney, formatMoney, parseMoney, percentOf } from "@/lib/money";

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

describe("percentOf", () => {
  it("takes a percentage given in basis points (1200 is 12%)", () => {
    expect(percentOf(10000, 1200)).toBe(1200);
    expect(percentOf(5900, 1200)).toBe(708);
    expect(percentOf(0, 1200)).toBe(0);
  });

  it("rounds half up, once", () => {
    expect(percentOf(5, 1000)).toBe(1);
    expect(percentOf(15, 1000)).toBe(2);
    expect(percentOf(14, 1000)).toBe(1);
    expect(percentOf(4, 1000)).toBe(0);
  });

  it("mirrors for negatives so a refund equals the original charge", () => {
    expect(percentOf(-5, 1000)).toBe(-1);
    expect(percentOf(-14, 1000)).toBe(-1);
    expect(percentOf(-5900, 1200)).toBe(-708);
  });

  it("rejects non-integer inputs", () => {
    expect(() => percentOf(59.5, 1200)).toThrow(RangeError);
    expect(() => percentOf(5900, 12.5)).toThrow(RangeError);
  });
});
