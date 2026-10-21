import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Breadcrumb } from "@/components/breadcrumb";
import { FillCartButton } from "@/components/cart/fill-cart-button";
import { formatPackSize } from "@/components/product/format";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import { productHref } from "@/lib/routes";
import { getShoppingList } from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";

import { listToCartAction } from "../actions";
import {
  DeleteListButton,
  ListItemControls,
  RenameListForm,
} from "../list-forms";

export const metadata: Metadata = {
  title: "Your list",
  robots: { index: false },
};

type Props = PageProps<"/account/lists/[id]">;

export default function ListPage({ params }: Props) {
  return (
    <section className="wrap pb-14">
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-64 max-w-2xl" />}
      >
        <List params={params} />
      </Suspense>
    </section>
  );
}

async function List({ params }: { params: Props["params"] }) {
  const { id } = await params;
  const customer = await requireCustomer(`/account/lists/${id}`);
  const list = await getShoppingList(customer.id, id);
  if (!list) notFound();
  return (
    <>
      <Breadcrumb
        items={[
          { name: "Your account", href: "/account" },
          { name: "Your lists", href: "/account/lists" },
          { name: list.name, href: `/account/lists/${list.id}` },
        ]}
      />
      <div className="grid max-w-2xl gap-8 pt-2">
        <div className="grid gap-4">
          <h1 className="type-h1">{list.name}</h1>
          {list.items.length > 0 && (
            <FillCartButton
              fill={listToCartAction.bind(null, list.id)}
              label="Add all to cart"
            />
          )}
        </div>
        {list.items.length === 0 ? (
          <p className="text-muted-foreground">
            Nothing on this list yet. Open any Product and choose Save to a
            list.
          </p>
        ) : (
          <ul className="divide-border grid divide-y">
            {list.items.map(({ product, quantity }) => {
              const name = productName(product);
              return (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span className="grid gap-0.5">
                    <Link
                      href={productHref(product)}
                      className="font-semibold hover:underline"
                    >
                      {name}
                    </Link>
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {formatPackSize(product.packSize, product.isWeighed)},{" "}
                      {formatMoney(product.priceCents)}
                    </span>
                  </span>
                  <ListItemControls
                    listId={list.id}
                    productId={product.id}
                    name={name}
                    quantity={quantity}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <RenameListForm id={list.id} name={list.name} />
        <DeleteListButton id={list.id} name={list.name} />
      </div>
    </>
  );
}
