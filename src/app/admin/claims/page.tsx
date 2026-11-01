import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CLAIM_REASON, CLAIM_STATUS } from "@/components/order/claim-labels";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listClaimsForStaff } from "@/modules/claims";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Freshness Claims" };

type Props = PageProps<"/admin/claims">;

export default function ClaimsPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/claims" area="claims">
        <Claims searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

/** Open claims, oldest first; or the latest decided ones (ADR 0016). */
async function Claims({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const decided = (await searchParams).show === "decided";
  const claims = await listClaimsForStaff(decided ? "decided" : "open");
  const tab = (on: boolean) =>
    `inline-flex min-h-11 items-center border-b-2 px-3 font-semibold ${on ? "border-ink" : "text-muted-foreground border-transparent"}`;
  return (
    <section className="grid gap-5">
      <h1 className="type-h2">Freshness Claims</h1>
      <nav
        aria-label="Which claims"
        className="border-border flex gap-1 border-b"
      >
        <Link
          href="/admin/claims"
          aria-current={decided ? undefined : "page"}
          className={tab(!decided)}
        >
          To review
        </Link>
        <Link
          href="/admin/claims?show=decided"
          aria-current={decided ? "page" : undefined}
          className={tab(decided)}
        >
          Decided
        </Link>
      </nav>
      {claims.length === 0 ? (
        <p className="text-muted-foreground">
          {decided ? "No claims decided yet." : "Nothing to review. Good."}
        </p>
      ) : (
        <ul className="divide-border grid divide-y">
          {claims.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/claims/${c.id}`}
                className="hover:bg-muted/60 flex flex-wrap items-center justify-between gap-3 px-1 py-3"
              >
                <span className="grid gap-0.5">
                  <b>
                    {c.orderLine.nameSnapshot}: {CLAIM_REASON[c.reason]}
                  </b>
                  <span className="text-muted-foreground text-sm">
                    <span className="font-mono">{c.order.orderNo}</span>,{" "}
                    {c.customer.name}, {formatDateTime(c.createdAt)}
                  </span>
                </span>
                <span className="grid justify-items-end gap-0.5 text-sm">
                  <b className="tabular-nums">
                    {formatMoney(c.resolvedCents ?? c.claimedCents)}
                  </b>
                  <span className="text-muted-foreground">
                    {CLAIM_STATUS[c.status]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
