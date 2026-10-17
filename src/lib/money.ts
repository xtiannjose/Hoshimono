// Money is integer centavos everywhere (ADR 0002). Format only at the UI edge.

function assertCentavos(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Not an integer number of centavos: ${value}`);
  }
}

/** 124900 -> "₱1,249.00". Centavos are always shown. */
export function formatMoney(cents: number): string {
  assertCentavos(cents);
  const abs = Math.abs(cents);
  const pesos = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const centavos = (abs % 100).toString().padStart(2, "0");
  return `${cents < 0 ? "-" : ""}₱${pesos}.${centavos}`;
}

const AMOUNT = /^(?:₱|php)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/i;

/** "₱1,249.00" or "59.5" -> centavos. Returns null for anything unclear or negative. */
export function parseMoney(input: string): number | null {
  const match = AMOUNT.exec(input.trim());
  if (!match) return null;
  const pesos = Number(match[1].replaceAll(",", ""));
  const centavos = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = pesos * 100 + centavos;
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Sum of centavos. Throws on non-integers so float errors cannot enter. */
export function addMoney(...amounts: number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertCentavos(amount);
    total += amount;
  }
  assertCentavos(total);
  return total;
}

/**
 * `bps` of `cents`, in basis points (1200 is 12%). The one rounding rule for
 * percentages: round half up on the magnitude, so negatives mirror positives
 * and a refund always equals its charge. Apply per Order Line, then sum.
 */
export function percentOf(cents: number, bps: number): number {
  assertCentavos(cents);
  assertCentavos(bps);
  const rounded = Math.floor((Math.abs(cents) * Math.abs(bps) + 5000) / 10000);
  const result = cents < 0 !== bps < 0 ? -rounded : rounded;
  assertCentavos(result);
  return result === 0 ? 0 : result; // normalise -0
}

/**
 * `cents` scaled by `numerator / denominator`, rounded half up once on the
 * magnitude (the same rule as percentOf). Used for Unit Prices and weighed
 * lines: price per kg times grams over 1,000.
 */
export function prorate(
  cents: number,
  numerator: number,
  denominator: number
): number {
  assertCentavos(cents);
  assertCentavos(numerator);
  assertCentavos(denominator);
  if (denominator <= 0) {
    throw new RangeError(`Denominator must be positive: ${denominator}`);
  }
  const product = Math.abs(cents) * Math.abs(numerator);
  const rounded = Math.floor((2 * product + denominator) / (2 * denominator));
  const result = cents < 0 !== numerator < 0 ? -rounded : rounded;
  assertCentavos(result);
  return result === 0 ? 0 : result;
}
