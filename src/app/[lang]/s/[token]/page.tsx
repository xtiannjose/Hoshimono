import { ArrowsLeftRightIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getSubstitution } from "@/modules/orders";

import { answerAction } from "./actions";

export const metadata: Metadata = {
  title: "A substitute for your order",
  robots: { index: false },
};

type Props = PageProps<"/[lang]/s/[token]">;

export default function SubstitutionPage({ params }: Props) {
  return (
    <section className="wrap max-w-xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="rounded-card h-80" />}>
        <Answer params={params} />
      </Suspense>
    </section>
  );
}

/** Yes or no to one Substitution, from the link we texted (ADR 0010). */
async function Answer({ params }: { params: Props["params"] }) {
  const { token } = await params;
  const sub = await getSubstitution({ token });
  if (!sub) notFound();
  const open =
    sub.answer === "waiting" &&
    !!sub.windowEndsAt &&
    sub.windowEndsAt > new Date();
  const each = formatMoney(sub.substitute.unitPriceCents);
  const offer = `${sub.substitute.quantity} x ${sub.substitute.name} at ${each} each`;

  return (
    <div className="rounded-card border-border bg-card grid justify-items-start gap-4 border p-6 md:p-8">
      <ArrowsLeftRightIcon size={36} aria-hidden />
      <p className="text-muted-foreground text-sm tabular-nums">
        Order {sub.orderNo}
      </p>
      <h1 className="type-h1">
        {open
          ? "Is this substitute okay?"
          : sub.answer === "refused"
            ? "Okay, we'll leave it out"
            : "We're sending the substitute"}
      </h1>
      <p className="max-w-[60ch]">
        We&apos;re out of <b>{sub.ordered.name}</b>. Instead we can send{" "}
        <b>{offer}</b>. You never pay more than for what you ordered.
      </p>
      {open && sub.windowEndsAt && (
        <>
          <p className="max-w-[60ch]">
            Answer by{" "}
            <b className="tabular-nums">{formatTime(sub.windowEndsAt)}</b>. No
            answer means yes.
          </p>
          <div className="flex flex-wrap gap-3">
            <form action={answerAction.bind(null, token, true)}>
              <Button type="submit">Yes, send it</Button>
            </form>
            <form action={answerAction.bind(null, token, false)}>
              <Button type="submit" variant="secondary">
                No, leave it out
              </Button>
            </form>
          </div>
        </>
      )}
      {!open && sub.answer === "refused" && (
        <p>You won&apos;t pay for it. The rest of your order is on its way.</p>
      )}
      {!open && sub.answer !== "refused" && (
        <p>
          {sub.answer === "accepted"
            ? "Thanks for answering."
            : "The time to answer has passed, so we went ahead."}{" "}
          You&apos;ll see it on your order.
        </p>
      )}
    </div>
  );
}
