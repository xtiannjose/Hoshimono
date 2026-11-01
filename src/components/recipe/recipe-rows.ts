import { relatedProducts, stockStates } from "@/app/_data/storefront";
import { formatPackSize } from "@/components/product/format";
import type { Lang } from "@/i18n/lang";
import { getLang } from "@/i18n/server";
import { productName } from "@/lib/product-name";
import { productHref } from "@/lib/routes";
import type { ProductSummary } from "@/modules/catalog";
import { SIMILAR_LIMIT, type RecipeView } from "@/modules/content";

export type RowProduct = {
  id: string;
  name: string;
  pack: string;
  priceCents: number;
  href: string;
};

/** One ingredient to buy, as the Recipe's add-to-cart panel shows it. */
export type RecipeRow = {
  id: string;
  name: string;
  note: string;
  quantity: number;
  scales: boolean;
  /** "Usually at home": starts unticked. */
  optional: boolean;
  /** Null when the Product is no longer sold. */
  product: RowProduct | null;
  soldOut: boolean;
  /** A similar Product in stock, offered when this one is sold out. */
  alternative: RowProduct | null;
};

export type RecipeExtra = { name: string; note: string };

const rowProduct = (p: ProductSummary, lang: Lang): RowProduct => ({
  id: p.id,
  name: productName(p),
  pack: formatPackSize(p.packSize, p.isWeighed, lang),
  priceCents: p.priceCents,
  href: productHref(p),
});

/**
 * The panel's rows with today's stock, and a similar Product in stock for
 * each sold-out one (ADR 0013); plain-text ingredients come apart.
 */
export async function recipeRows(
  recipe: RecipeView
): Promise<{ rows: RecipeRow[]; extras: RecipeExtra[] }> {
  const lang = await getLang();
  const buyable = recipe.ingredients.filter((i) => i.productId);
  const stock = await stockStates(buyable.flatMap((i) => i.product?.id ?? []));
  const rows = await Promise.all(
    buyable.map(async (i): Promise<RecipeRow> => {
      const soldOut = !i.product || stock[i.product.id] === "out";
      let alternative: RowProduct | null = null;
      if (soldOut && i.productId) {
        const similar = await relatedProducts(i.productId, SIMILAR_LIMIT);
        const states = await stockStates(similar.map((p) => p.id));
        const inStock = similar.find((p) => (states[p.id] ?? "out") !== "out");
        alternative = inStock ? rowProduct(inStock, lang) : null;
      }
      return {
        id: i.id,
        name: i.name,
        note: i.note,
        quantity: i.quantity,
        scales: i.scales,
        optional: i.optional,
        product: i.product ? rowProduct(i.product, lang) : null,
        soldOut,
        alternative,
      };
    })
  );
  const extras = recipe.ingredients
    .filter((i) => !i.productId)
    .map((i) => ({ name: i.name, note: i.note }));
  return { rows, extras };
}
