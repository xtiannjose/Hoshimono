import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CLAIM_REASON, CLAIM_STATUS } from "@/components/order/claim-labels";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getClaimForStaff } from "@/modules/claims";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { ApproveForm, RejectForm } from "../decision-forms";

export const metadata: Metadata = { title: "Freshness Claim" };

type Props = PageProps<"/admin/claims/[id]">;

export default function ClaimPage({ params }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/claims" area="claims">
        <Claim params={params} />
      </StaffGate>
    </Suspense>
  );
}

/** One claim: what the Customer says and shows, and the decision (ADR 0016). */
async function Claim({ params }: { params: Props["params"] }) {
  const claim = await getClaimForStaff((await params).id);
  if (!claim) notFound();
  const line = claim.orderLine;
  const method = claim.order.payments[0]?.method;
  const weighed = line.orderedWeightGrams !== null;
  return (
    <section className="grid max-w-3xl gap-6">
      <div className="grid gap-1">
        <Link
          href="/admin/claims"
          className="text-muted-foreground text-sm hover:underline"
        >
          All claims
        </Link>
        <h1 className="type-h2">
          {line.nameSnapshot}: {CLAIM_REASON[claim.reason]}
        </h1>
        <p>
          <Link
            href={`/admin/orders/${claim.order.orderNo}`}
            className="font-mono font-semibold hover:underline"
          >
            {claim.order.orderNo}
          </Link>
          , {claim.customer.name}.{" "}
          <span className="text-muted-foreground">
            Delivered{" "}
            {claim.order.deliveredAt && formatDateTime(claim.order.deliveredAt)}
            , reported {formatDateTime(claim.createdAt)}.
          </span>
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="grid">
          <dt className="text-muted-foreground text-sm">Claimed</dt>
          <dd className="font-semibold">
            {weighed
              ? `The whole pack (${line.finalWeightGrams ?? line.orderedWeightGrams} g)`
              : `${claim.units} of ${line.fulfilledQty ?? line.orderedQty}`}
          </dd>
        </div>
        <div className="grid">
          <dt className="text-muted-foreground text-sm">Worth</dt>
          <dd className="font-semibold tabular-nums">
            {formatMoney(claim.claimedCents)}
          </dd>
        </div>
        <div className="grid">
          <dt className="text-muted-foreground text-sm">Status</dt>
          <dd className="font-semibold">{CLAIM_STATUS[claim.status]}</dd>
        </div>
      </dl>

      {claim.note && (
        <blockquote className="border-border border-l-4 pl-4">
          {claim.note}
        </blockquote>
      )}
      {claim.photoUrls.length > 0 && (
        <ul
          aria-label="Photos"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {claim.photoUrls.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                <span className="rounded-field photo-slot relative block aspect-square overflow-hidden">
                  <Image
                    src={url}
                    alt={`Customer photo ${i + 1} of ${line.nameSnapshot}`}
                    fill
                    sizes="(min-width: 640px) 240px, 50vw"
                    className="object-cover"
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {claim.status === "open" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ApproveForm
            claimId={claim.id}
            claimed={(claim.claimedCents / 100).toFixed(2)}
            payback={
              method === "gcash" || method === "card"
                ? `Refunded to the Customer's ${method === "gcash" ? "GCash" : "card"}.`
                : "Paid by cash: the Customer gets a Voucher for it, no minimum spend, 90 days."
            }
          />
          <RejectForm claimId={claim.id} />
        </div>
      ) : (
        <p className="rounded-card bg-muted p-4">
          {CLAIM_STATUS[claim.status]} by {claim.decidedBy?.name}
          {claim.decidedAt && `, ${formatDateTime(claim.decidedAt)}`}.{" "}
          {claim.status === "approved" &&
            `${formatMoney(claim.resolvedCents ?? 0)} ${claim.payback === "refund" ? "refunded" : `as Voucher ${claim.voucher?.code}`}.`}
          {claim.decisionNote && ` Note: ${claim.decisionNote}`}
        </p>
      )}
    </section>
  );
}
