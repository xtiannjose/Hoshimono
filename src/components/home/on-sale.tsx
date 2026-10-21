import { onSaleProducts, stockStates } from "@/app/_data/storefront";
import { ProductGrid } from "@/components/product/product-grid";

/** "On sale this week" on Home (PRD CAT-1, ADR 0015); nothing without a Promotion. */
export async function OnSale() {
  const products = await onSaleProducts(6);
  if (products.length === 0) return null;
  const stock = await stockStates(products.map((p) => p.id));
  return (
    <section aria-labelledby="sale-h" className="wrap pt-14">
      <h2 id="sale-h" className="type-h2 mb-5">
        On sale this week
      </h2>
      <ProductGrid products={products} stock={stock} empty={null} />
    </section>
  );
}
