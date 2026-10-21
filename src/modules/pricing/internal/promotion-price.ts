import { prorate } from "@/lib/money";

/** A running Promotion, as the price rule needs it (ADR 0015). */
export type PromotionRule = {
  id: string;
  name: string;
  kind: "percent" | "amount";
  /** Percent off, or centavos off each unit. */
  value: number;
  productIds: string[];
  categoryIds: string[];
};

export type PromotedPrice = {
  priceCents: number;
  promotionId: string;
  name: string;
};

/**
 * The shelf price under the best matching Promotion, or null when none
 * matches. `categoryIds` are the Product's Category and its parents.
 */
export function promotedPrice(
  product: { id: string; categoryIds: string[] },
  priceCents: number,
  promotions: PromotionRule[]
): PromotedPrice | null {
  let best: PromotedPrice | null = null;
  for (const p of promotions) {
    const matches =
      p.productIds.includes(product.id) ||
      p.categoryIds.some((c) => product.categoryIds.includes(c));
    if (!matches) continue;
    const price = Math.max(
      0,
      p.kind === "percent"
        ? prorate(priceCents, 100 - p.value, 100)
        : priceCents - p.value
    );
    if (price < priceCents && (!best || price < best.priceCents))
      best = { priceCents: price, promotionId: p.id, name: p.name };
  }
  return best;
}
