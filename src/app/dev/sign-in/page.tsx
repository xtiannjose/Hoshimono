import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { testMailboxEnabled } from "@/lib/test-mode";

import { TEST_ACCOUNTS } from "./accounts";

export const metadata: Metadata = {
  title: "Test accounts",
  robots: { index: false },
};

export default function DevSignInPage() {
  return (
    <section className="wrap max-w-xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="rounded-card h-72" />}>
        <Accounts />
      </Suspense>
    </section>
  );
}

/**
 * One-click sign-in for the seeded test accounts. Only where the dev
 * mailbox runs (E2E_MAILBOX=1 in development or the local e2e build).
 */
async function Accounts() {
  await connection();
  if (!testMailboxEnabled()) notFound();
  return (
    <div className="rounded-card border-border bg-card grid gap-5 border p-6 md:p-8">
      <p className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold">
        Test accounts for development. This page never runs on a real domain.
      </p>
      <h1 className="type-h1">Sign in as</h1>
      <ul className="divide-border grid divide-y">
        {TEST_ACCOUNTS.map((a) => (
          <li
            key={a.email}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <span>
              <b className="block">{a.label}</b>
              <span className="text-muted-foreground text-sm">{a.email}</span>
            </span>
            {/* A plain link: the browser follows the magic link itself. */}
            <Button asChild variant="secondary">
              <a
                href={`/dev/sign-in/go?as=${encodeURIComponent(a.email)}`}
                aria-label={`Sign in as ${a.label}`}
              >
                Sign in
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
