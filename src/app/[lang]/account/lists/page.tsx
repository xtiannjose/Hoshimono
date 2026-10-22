import type { Metadata } from "next";
import Link from "@/components/link";
import { Suspense } from "react";

import { Breadcrumb } from "@/components/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { listShoppingLists } from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";

import { CreateListForm } from "./list-forms";

export const metadata: Metadata = {
  title: "Your lists",
  robots: { index: false },
};

export default function ListsPage() {
  return (
    <section className="wrap pb-14">
      <Breadcrumb
        items={[
          { name: "Your account", href: "/account" },
          { name: "Your lists", href: "/account/lists" },
        ]}
      />
      <h1 className="type-h1 pt-2">Your lists</h1>
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-48 max-w-2xl" />}
      >
        <Lists />
      </Suspense>
    </section>
  );
}

/** Shopping Lists, most recently used first (ADR 0014). */
async function Lists() {
  const customer = await requireCustomer("/account/lists");
  const lists = await listShoppingLists(customer.id);
  return (
    <div className="mt-6 grid max-w-2xl gap-8">
      {lists.length === 0 ? (
        <p className="text-muted-foreground">
          No lists yet. Save Products from any Product page, or your whole cart,
          to buy them again in one tap.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/account/lists/${l.id}`}
                className="rounded-card border-border bg-card hover:border-border-strong grid gap-1 border p-5"
              >
                <b>{l.name}</b>
                <span className="text-muted-foreground text-sm">
                  {l.itemCount} {l.itemCount === 1 ? "item" : "items"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CreateListForm />
    </div>
  );
}
