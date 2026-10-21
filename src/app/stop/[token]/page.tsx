import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { stopRemindersAction } from "./actions";

export const metadata: Metadata = {
  title: "Stop reminders and offers",
  robots: { index: false },
};

type Props = PageProps<"/stop/[token]">;

export default function StopPage({ params, searchParams }: Props) {
  return (
    <section className="wrap grid max-w-xl gap-4 py-14">
      <h1 className="type-h1">Reminders and offers</h1>
      <Suspense fallback={<Skeleton className="rounded-card h-24" />}>
        <Stop params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** The stop link from a Cart Reminder: one button, no sign-in (ADR 0014). */
async function Stop({ params, searchParams }: Props) {
  const { token } = await params;
  if ((await searchParams).done === "1")
    return (
      <p role="status" className="type-lead">
        Done. We will not send you reminders or offers. Order and delivery
        messages still come.{" "}
        <Link href="/" className="font-semibold underline underline-offset-4">
          Back to the shop
        </Link>
      </p>
    );
  return (
    <form action={stopRemindersAction.bind(null, token)} className="grid gap-4">
      <p className="type-lead">
        Stop emails like cart reminders and offers? Messages about your orders
        still come.
      </p>
      <div>
        <Button type="submit">Stop reminders and offers</Button>
      </div>
    </form>
  );
}
