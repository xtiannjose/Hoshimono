import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PendingButton } from "@/components/checkout/payment-status";
import { formatMoney } from "@/lib/money";
import { paymentProvider } from "@/modules/payments";

import { standInFailAction, standInPayAction } from "./actions";

export const metadata: Metadata = {
  title: "Stand-in payment",
  robots: { index: false },
};

export default function StandInPayPage({
  params,
  searchParams,
}: PageProps<"/dev/pay/[ref]">) {
  return (
    <section className="wrap max-w-xl py-10 md:py-14">
      <Suspense
        fallback={<div className="bg-muted rounded-card h-72 animate-pulse" />}
      >
        <StandIn params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** The stand-in provider's hosted checkout (PAYMENT_PROVIDER=fake). */
async function StandIn({ params, searchParams }: PageProps<"/dev/pay/[ref]">) {
  if (!paymentProvider("fake")) notFound();
  const { ref } = await params;
  const query = await searchParams;
  const one = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : "";
  };
  return (
    <div className="rounded-card border-border bg-card grid gap-4 border p-6 md:p-8">
      <p className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold">
        Stand-in payment page for development and tests. No money moves.
      </p>
      <h1 className="type-h1">Pay {formatMoney(Number(one("amount")))}</h1>
      <p className="text-muted-foreground tabular-nums">
        For {one("reference")}
      </p>
      <div className="flex flex-wrap gap-3">
        <form action={standInPayAction}>
          <input type="hidden" name="ref" value={ref} />
          <input type="hidden" name="amount" value={one("amount")} />
          <input type="hidden" name="success" value={one("success")} />
          <PendingButton pendingLabel="Paying...">Pay</PendingButton>
        </form>
        <form action={standInFailAction}>
          <input type="hidden" name="cancel" value={one("cancel")} />
          <PendingButton variant="secondary" pendingLabel="Failing...">
            Fail payment
          </PendingButton>
        </form>
      </div>
    </div>
  );
}
