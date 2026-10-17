import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Tag } from "@/components/product/tag";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { listAddresses } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";

import { deleteAddressAction, makeDefaultAction } from "./actions";

export const metadata: Metadata = { title: "Your addresses" };

const LINK =
  "text-sm font-semibold underline underline-offset-[3px] min-h-11 inline-flex items-center";

export default function AddressesPage() {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Your addresses</h1>
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-40 max-w-xl" />}
      >
        <AddressList />
      </Suspense>
    </section>
  );
}

async function AddressList() {
  const customer = await requireCustomer("/account/addresses");
  const addresses = await listAddresses(customer.id);
  return (
    <div className="mt-6 grid max-w-xl gap-4">
      {addresses.length === 0 && (
        <p className="text-muted-foreground">
          No saved addresses yet. Add one so checkout takes seconds.
        </p>
      )}
      <ul className="grid gap-3">
        {addresses.map((a) => (
          <li
            key={a.id}
            className="rounded-card border-border bg-card grid gap-1 border p-5"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold">{a.label}</h2>
              {a.isDefault && <Tag tone="soft">Default</Tag>}
            </div>
            <p>
              {a.line1}, {a.barangay}, {a.city}
            </p>
            <p className="text-muted-foreground text-sm">
              Landmark: {a.landmark}
            </p>
            {a.notes && (
              <p className="text-muted-foreground text-sm">Notes: {a.notes}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-5">
              <Link href={`/account/addresses/${a.id}`} className={LINK}>
                Edit<span className="sr-only"> {a.label}</span>
              </Link>
              {!a.isDefault && (
                <form action={makeDefaultAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className={LINK}>
                    Make default<span className="sr-only"> {a.label}</span>
                  </button>
                </form>
              )}
              <form action={deleteAddressAction}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className={LINK}>
                  Remove<span className="sr-only"> {a.label}</span>
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Link href="/account/addresses/new" className={PRIMARY_BUTTON}>
          Add an address
        </Link>
      </div>
    </div>
  );
}
