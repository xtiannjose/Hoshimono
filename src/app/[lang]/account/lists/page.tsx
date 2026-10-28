import type { Metadata } from "next";
import Link from "@/components/link";
import { Suspense } from "react";

import { Breadcrumb } from "@/components/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { getMessages } from "@/i18n/server";
import { listShoppingLists } from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";

import { CreateListForm } from "./list-forms";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).lists.title,
    robots: { index: false },
  };
}

export default async function ListsPage() {
  const m = await getMessages();
  return (
    <section className="wrap pb-14">
      <Breadcrumb
        items={[
          { name: m.account.title, href: "/account" },
          { name: m.lists.title, href: "/account/lists" },
        ]}
      />
      <h1 className="type-h1 pt-2">{m.lists.title}</h1>
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
  const m = await getMessages();
  return (
    <div className="mt-6 grid max-w-2xl gap-8">
      {lists.length === 0 ? (
        <p className="text-muted-foreground">{m.lists.none}</p>
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
                  {l.itemCount} {m.items(l.itemCount)}
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
