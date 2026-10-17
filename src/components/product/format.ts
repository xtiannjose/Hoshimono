// Display rules for Product cards and pages (docs/05-DESIGN-SYSTEM.md section 8).
import type { UnitPrice } from "@/modules/catalog";
import { formatMoney } from "@/lib/money";

type PackSize = { value: number; unit: "g" | "ml" | "pc" };

function decimal(value: number): string {
  return String(Number((value / 1000).toFixed(3)));
}

/** "1 kg", "450 g", "1.5 L", "12 pcs"; Weighed Products get "approx.". */
export function formatPackSize(size: PackSize, isWeighed: boolean): string {
  const text =
    size.unit === "g"
      ? size.value >= 1000
        ? `${decimal(size.value)} kg`
        : `${size.value} g`
      : size.unit === "ml"
        ? size.value >= 1000
          ? `${decimal(size.value)} L`
          : `${size.value} ml`
        : `${size.value} ${size.value === 1 ? "pc" : "pcs"}`;
  return isWeighed ? `approx. ${text}` : text;
}

const BASIS: Record<UnitPrice["basis"], string> = {
  per_100g: "per 100 g",
  per_litre: "per litre",
  per_piece: "per piece",
};

export function unitPriceLabel(unitPrice: UnitPrice): string {
  return `${formatMoney(unitPrice.cents)} ${BASIS[unitPrice.basis]}`;
}

/** "₱160" and ".00", so cards can show centavos smaller, never dropped. */
export function splitMoney(cents: number): { whole: string; fraction: string } {
  const text = formatMoney(cents);
  const dot = text.lastIndexOf(".");
  return { whole: text.slice(0, dot), fraction: text.slice(dot) };
}

/** Whole percent saved, rounded down; null when there is no compare-at price. */
export function salePercent(
  priceCents: number,
  compareAtCents: number | null
): number | null {
  if (compareAtCents === null || compareAtCents <= priceCents) return null;
  return Math.floor(((compareAtCents - priceCents) * 100) / compareAtCents);
}
