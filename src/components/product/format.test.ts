import { describe, expect, it } from "vitest";

import {
  formatPackSize,
  salePercent,
  splitMoney,
  unitPriceLabel,
} from "./format";

describe("formatPackSize", () => {
  it("uses kg and L from 1,000 and keeps small sizes as they are", () => {
    expect(formatPackSize({ value: 1000, unit: "g" }, false)).toBe("1 kg");
    expect(formatPackSize({ value: 1250, unit: "g" }, false)).toBe("1.25 kg");
    expect(formatPackSize({ value: 450, unit: "g" }, false)).toBe("450 g");
    expect(formatPackSize({ value: 1500, unit: "ml" }, false)).toBe("1.5 L");
    expect(formatPackSize({ value: 360, unit: "ml" }, false)).toBe("360 ml");
    expect(formatPackSize({ value: 1, unit: "pc" }, false)).toBe("1 pc");
    expect(formatPackSize({ value: 12, unit: "pc" }, false)).toBe("12 pcs");
  });

  it("marks Weighed Products as approximate", () => {
    expect(formatPackSize({ value: 1000, unit: "g" }, true)).toBe(
      "approx. 1 kg"
    );
  });
});

describe("unitPriceLabel", () => {
  it("says the price per measure", () => {
    expect(unitPriceLabel({ cents: 950, basis: "per_100g" })).toBe(
      "₱9.50 per 100 g"
    );
    expect(unitPriceLabel({ cents: 11667, basis: "per_litre" })).toBe(
      "₱116.67 per litre"
    );
    expect(unitPriceLabel({ cents: 4125, basis: "per_piece" })).toBe(
      "₱41.25 per piece"
    );
  });
});

describe("splitMoney", () => {
  it("splits pesos from centavos for the small-centavos card style", () => {
    expect(splitMoney(16000)).toEqual({ whole: "₱160", fraction: ".00" });
    expect(splitMoney(124950)).toEqual({ whole: "₱1,249", fraction: ".50" });
  });
});

describe("salePercent", () => {
  it("rounds down so a saving is never overstated", () => {
    expect(salePercent(14800, 17400)).toBe(14);
    expect(salePercent(19000, 22500)).toBe(15);
    expect(salePercent(10000, null)).toBeNull();
  });
});
