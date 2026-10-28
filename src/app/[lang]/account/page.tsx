import type { Metadata } from "next";
import Link from "@/components/link";
import { Suspense } from "react";

import { SignOutForm } from "@/components/sign-out-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLang, getMessages } from "@/i18n/server";
import { displayPhone } from "@/lib/phone";
import { getProfile } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";

import { DeleteAccount } from "./delete-account";
import { NameForm } from "./name-form";
import { RemindersToggle } from "./reminders-toggle";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).account.title };
}

const LINK =
  "rounded-card border-border bg-card hover:border-border-strong grid gap-1 border p-5";

const PAGES = [
  ["orders", "/account/orders"],
  ["addresses", "/account/addresses"],
  ["lists", "/account/lists"],
  ["invite", "/account/invite"],
] as const;

export default async function AccountPage() {
  const t = (await getMessages()).account;
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">{t.title}</h1>
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
  const lang = await getLang();
  const t = (await getMessages()).account;
  return (
    <div className="mt-6 grid max-w-xl gap-6">
      <div className="grid gap-4">
        <NameForm name={profile.name} />
        <p className="text-muted-foreground text-sm">
          {t.signedInWith}{" "}
          <b className="text-foreground">
            {profile.email ?? (profile.phone && displayPhone(profile.phone))}
          </b>
        </p>
      </div>
      <nav aria-label={t.title} className="grid gap-3 sm:grid-cols-2">
        {PAGES.map(([key, href]) => (
          <Link key={key} href={href} className={LINK}>
            <b>{t.links[key].name}</b>
            <span className="text-muted-foreground text-sm">
              {t.links[key].hint}
            </span>
          </Link>
        ))}
      </nav>
      <section aria-labelledby="h-messages" className="grid gap-2">
        <h2 id="h-messages" className="type-h3">
          {t.messages}
        </h2>
        <RemindersToggle on={profile.marketingOptIn} />
      </section>
      <section
        aria-labelledby="h-data"
        className="grid justify-items-start gap-2"
      >
        <h2 id="h-data" className="type-h3">
          {t.yourData}
        </h2>
        <p className="text-muted-foreground text-sm">{t.yourDataBody}</p>
        <a
          href="/api/account/data"
          download
          className={buttonVariants({ variant: "secondary" })}
        >
          {t.download}
        </a>
        <DeleteAccount lang={lang} />
      </section>
      <SignOutForm>
        <input type="hidden" name="lang" value={lang} />
        <Button type="submit" variant="secondary">
          {t.signOut}
        </Button>
      </SignOutForm>
    </div>
  );
}
