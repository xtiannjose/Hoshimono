import type { Metadata } from "next";
import Link from "@/components/link";
import { Suspense } from "react";

import { SignOutForm } from "@/components/sign-out-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { displayPhone } from "@/lib/phone";
import { getProfile } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";

import { NameForm } from "./name-form";
import { RemindersToggle } from "./reminders-toggle";

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
          <b className="text-foreground">
            {profile.email ?? (profile.phone && displayPhone(profile.phone))}
          </b>
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
        <Link href="/account/lists" className={LINK}>
          <b>Your lists</b>
          <span className="text-muted-foreground text-sm">
            Weekly groceries and more, added to your cart in one tap
          </span>
        </Link>
        <Link href="/account/invite" className={LINK}>
          <b>Invite friends</b>
          <span className="text-muted-foreground text-sm">
            ₱100 off for you and a friend, and your Vouchers
          </span>
        </Link>
      </nav>
      <section aria-labelledby="h-messages" className="grid gap-2">
        <h2 id="h-messages" className="type-h3">
          Messages
        </h2>
        <RemindersToggle on={profile.marketingOptIn} />
      </section>
      <SignOutForm>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </SignOutForm>
    </div>
  );
}
