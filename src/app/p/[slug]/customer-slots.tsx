import Link from "next/link";

import { saveProductAction } from "@/app/account/lists/actions";
import { SaveToList } from "@/components/lists/save-to-list";
import { StockAlertButton } from "@/components/product/stock-alert-button";
import { listShoppingLists } from "@/modules/cart";
import { currentCustomer } from "@/modules/identity";
import { hasStockAlert } from "@/modules/inventory";

// The parts of the Product page that depend on who is looking (ADR 0014).
// They read the session, so the page renders them inside Suspense.

export async function SaveToListSlot({ productId }: { productId: string }) {
  const customer = await currentCustomer();
  if (!customer) return null;
  const lists = await listShoppingLists(customer.id);
  return (
    <SaveToList
      action={saveProductAction.bind(null, productId)}
      lists={lists.map((l) => ({ id: l.id, name: l.name }))}
      summary="Save to a list"
      done="Saved."
    />
  );
}

export async function StockAlertSlot({
  productId,
  href,
}: {
  productId: string;
  href: string;
}) {
  const customer = await currentCustomer();
  if (!customer)
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(href)}`}
        className="decoration-border-strong text-sm font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
      >
        Sign in to get a message when it is back
      </Link>
    );
  return (
    <StockAlertButton
      productId={productId}
      on={await hasStockAlert(customer.id, productId)}
    />
  );
}
