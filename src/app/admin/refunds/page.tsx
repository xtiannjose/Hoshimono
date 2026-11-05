import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { REFUND_REASON_LABEL } from "@/components/order/status-labels";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listRefundsToCheck } from "@/modules/payments";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import { SettleRefundForms } from "./forms";

export const metadata: Metadata = { title: "Refunds to check" };

export default function AdminRefunds() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/refunds" area="refunds">
        <Refunds />
      </StaffGate>
    </Suspense>
  );
}

/** Refunds PayMongo did not clearly confirm, or keeps refusing (ADR 0008). */
async function Refunds() {
  const refunds = await listRefundsToCheck();
  return (
    <section className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="type-h2">Refunds to check</h1>
        <p className="text-muted-foreground max-w-2xl">
          A refund is never sent twice on its own. When PayMongo gave no clear
          answer, find the payment in the PayMongo dashboard by its id and see
          whether a refund is there.
        </p>
      </div>
      {refunds.length === 0 ? (
        <p>Nothing to check. Every refund went through.</p>
      ) : (
        <ul className="divide-border grid max-w-4xl divide-y">
          {refunds.map((r) => (
            <li key={r.id} className="grid gap-3 py-5 md:grid-cols-2">
              <div className="grid gap-1">
                <p>
                  <b className="tabular-nums">{formatMoney(r.amountCents)}</b>{" "}
                  to {r.method === "card" ? "card" : "GCash"},{" "}
                  {REFUND_REASON_LABEL[r.reason]}
                </p>
                <p className="text-sm">
                  Order{" "}
                  <Link
                    href={`/admin/orders/${r.orderNo}`}
                    className="font-mono font-semibold hover:underline"
                  >
                    {r.orderNo}
                  </Link>
                  , PayMongo payment{" "}
                  <span className="font-mono">{r.paymentRef ?? "unknown"}</span>
                </p>
                <p className="text-muted-foreground text-sm">
                  {r.status === "needs_review"
                    ? "No clear answer from PayMongo"
                    : "PayMongo keeps refusing it"}
                  {r.lastError && `: ${r.lastError}`}
                </p>
                <p className="text-muted-foreground text-sm tabular-nums">
                  Asked {formatDateTime(r.createdAt)}
                </p>
              </div>
              <SettleRefundForms refundId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
