import Link from "@/components/link";

import { productList, stockStates } from "@/app/_data/storefront";
import { ProductGrid } from "@/components/product/product-grid";
import { FRESH_PICKS_CATEGORY } from "@/config/home";
import { getMessages } from "@/i18n/server";
import { categoryHref } from "@/lib/routes";

export async function FreshPicks() {
  const list = await productList({
    categorySlug: FRESH_PICKS_CATEGORY,
    limit: 6,
  });
  const products = list?.items ?? [];
  const stock = await stockStates(products.map((p) => p.id));
  const t = (await getMessages()).home;
  return (
    <ProductGrid
      products={products}
      stock={stock}
      priorityCount={2}
      empty={
        <p>
          {t.noFresh}{" "}
          <Link
            href={categoryHref([FRESH_PICKS_CATEGORY])}
            className="font-semibold underline underline-offset-4"
          >
            {t.browseFresh}
          </Link>
        </p>
      }
    />
  );
}
