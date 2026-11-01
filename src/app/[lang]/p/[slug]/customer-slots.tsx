import Link from "@/components/link";

import { saveProductAction } from "@/app/[lang]/account/lists/actions";
import { SaveToList } from "@/components/lists/save-to-list";
import { StockAlertButton } from "@/components/product/stock-alert-button";
import { getMessages } from "@/i18n/server";
import { listShoppingLists } from "@/modules/cart";
import { currentCustomer } from "@/modules/identity";
import { hasStockAlert } from "@/modules/inventory";

// The parts of the Product page that depend on who is looking (ADR 0014).
// They read the session, so the page renders them inside Suspense.

export async function SaveToListSlot({ productId }: { productId: string }) {
  const customer = await currentCustomer();
  if (!customer) return null;
  const lists = await listShoppingLists(customer.id);
  const t = (await getMessages()).productPage;
  return (
    <SaveToList
      action={saveProductAction.bind(null, productId)}
      lists={lists.map((l) => ({ id: l.id, name: l.name }))}
      summary={t.saveToList}
      done={t.saved}
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
        {(await getMessages()).productPage.signInForAlert}
      </Link>
    );
  return (
    <StockAlertButton
      productId={productId}
      on={await hasStockAlert(customer.id, productId)}
    />
  );
}
