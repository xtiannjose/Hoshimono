// Display rules for Product cards and pages (docs/05-DESIGN-SYSTEM.md section 8).
import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import type { UnitPrice } from "@/modules/catalog";
import { formatMoney } from "@/lib/money";

import { packSizeLabel, type PackSize } from "./pack-size";

/** "1 kg", "450 g", "1.5 L", "12 pcs"; Weighed Products get "approx.". */
export function formatPackSize(
  size: PackSize,
  isWeighed: boolean,
  lang: Lang = "en"
): string {
  return packSizeLabel(size, isWeighed, MESSAGES[lang].product);
}

export function unitPriceLabel(
  unitPrice: UnitPrice,
  lang: Lang = "en"
): string {
  return `${formatMoney(unitPrice.cents)} ${MESSAGES[lang].product.basis[unitPrice.basis]}`;
}

/** Whole percent saved, rounded down; null when there is no compare-at price. */
export function salePercent(
  priceCents: number,
  compareAtCents: number | null
): number | null {
  if (compareAtCents === null || compareAtCents <= priceCents) return null;
  return Math.floor(((compareAtCents - priceCents) * 100) / compareAtCents);
}
