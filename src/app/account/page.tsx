import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireCustomer } from "@/modules/identity";

import { signOutAction } from "./actions";

export const metadata: Metadata = { title: "Your account" };

// Placeholder until Batch 2.6 builds the account area.
export default function AccountPage() {
  return (
    <section className="wrap py-14 md:py-20">
      <h1 className="type-h1">Your account</h1>
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-24 max-w-md" />}
      >
        <AccountSummary />
      </Suspense>
    </section>
  );
}

async function AccountSummary() {
  const customer = await requireCustomer("/account");
  return (
    <div className="mt-6 grid max-w-md justify-items-start gap-4">
      <p>
        Signed in as <b>{customer.email ?? customer.name}</b>
      </p>
      <Link
        href="/account/addresses"
        className="font-semibold underline underline-offset-[3px]"
      >
        Your addresses
      </Link>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
