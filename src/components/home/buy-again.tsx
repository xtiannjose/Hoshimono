import { stockStates } from "@/app/_data/storefront";
import { ProductGrid } from "@/components/product/product-grid";
import { getProductSummaries } from "@/modules/catalog";
import { currentCustomer } from "@/modules/identity";
import { listBoughtBefore } from "@/modules/orders";

/**
 * "Buy again" on Home (PRD CAT-1, ADR 0014): what a signed-in Customer has
 * bought, most often first. Nothing for guests or before a first delivery.
 */
export async function BuyAgain() {
  const customer = await currentCustomer();
  if (!customer) return null;
  const ids = await listBoughtBefore(customer.id, 12);
  if (ids.length === 0) return null;
  const products = await getProductSummaries(ids);
  const stock = await stockStates(products.map((p) => p.id));
  return (
    <section aria-labelledby="again-h" className="wrap pt-14">
      <h2 id="again-h" className="type-h2 mb-5">
        Buy again
      </h2>
      <ProductGrid products={products.slice(0, 6)} stock={stock} empty={null} />
    </section>
  );
}
