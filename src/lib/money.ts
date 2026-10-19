// Money is integer centavos everywhere (ADR 0002). Format only at the UI edge.

function assertCentavos(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Not an integer number of centavos: ${value}`);
  }
}

/** 124950 -> { whole: "₱1,249", fraction: ".50" }, so cards can show centavos smaller. */
export function moneyParts(cents: number): { whole: string; fraction: string } {
  assertCentavos(cents);
  const abs = Math.abs(cents);
  const pesos = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const centavos = (abs % 100).toString().padStart(2, "0");
  return {
    whole: `${cents < 0 ? "-" : ""}₱${pesos}`,
    fraction: `.${centavos}`,
  };
}

/** 124900 -> "₱1,249.00". Centavos are always shown. */
export function formatMoney(cents: number): string {
  const { whole, fraction } = moneyParts(cents);
  return whole + fraction;
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
 * `cents` scaled by `numerator / denominator`. The one rounding rule: round
 * half up once on the magnitude, so negatives mirror positives and a refund
 * always equals its charge. Used for VAT (12/112), Unit Prices and weighed
 * lines; apply per Order Line, then sum.
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
