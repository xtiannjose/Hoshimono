import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";

import { signOutAction } from "./actions";
import { NameForm } from "./name-form";

export const metadata: Metadata = { title: "Your account" };

const LINK =
  "rounded-card border-border bg-card hover:border-border-strong grid gap-1 border p-5";

export default function AccountPage() {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Your account</h1>
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-48 max-w-xl" />}
      >
        <Account />
      </Suspense>
    </section>
  );
}

async function Account() {
  const customer = await requireCustomer("/account");
  const profile = (await getProfile(customer.id))!;
  return (
    <div className="mt-6 grid max-w-xl gap-6">
      <div className="grid gap-4">
        <NameForm name={profile.name} />
        <p className="text-muted-foreground text-sm">
          Signed in with{" "}
          <b className="text-foreground">{profile.email ?? profile.phone}</b>
        </p>
      </div>
      <nav aria-label="Your account" className="grid gap-3 sm:grid-cols-2">
        <Link href="/account/orders" className={LINK}>
          <b>Your orders</b>
          <span className="text-muted-foreground text-sm">
            Track, cancel before picking, and see past orders
          </span>
        </Link>
        <Link href="/account/addresses" className={LINK}>
          <b>Your addresses</b>
          <span className="text-muted-foreground text-sm">
            Where we deliver, with landmarks for the Rider
          </span>
        </Link>
      </nav>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </div>
  );
}
