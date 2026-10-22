import Link from "next/link";

import { CLAIM_REASON, CLAIM_STATUS } from "@/components/order/claim-labels";
import { Tag } from "@/components/product/tag";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { claimableLines, listOrderClaims } from "@/modules/claims";

/**
 * On a delivered Order: the claims filed and, within 24 hours, a way to
 * report a problem (ADR 0016). Nothing before delivery.
 */
export async function OrderClaims({
  orderId,
  orderNo,
  customerId,
}: {
  orderId: string;
  orderNo: string;
  customerId: string;
}) {
  const [order, claims] = await Promise.all([
    claimableLines(orderNo, customerId),
    listOrderClaims(orderId, customerId),
  ]);
  if (!order?.windowEndsAt) return null;
  const canReport =
    order.open && order.lines.some((l) => !l.claim && l.units > 0);
  if (!canReport && claims.length === 0) return null;
  return (
    <section aria-labelledby="h-problem" className="grid gap-3">
      <h2 id="h-problem" className="type-h3">
        Problem with an item?
      </h2>
      {claims.length > 0 && (
        <ul className="divide-border grid divide-y">
          {claims.map((c) => (
            <li key={c.id} className="grid gap-1 py-2.5">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {c.orderLine.nameSnapshot}: {CLAIM_REASON[c.reason]}
                </span>
                <Tag tone={c.status === "approved" ? "soft" : "quiet"}>
                  {CLAIM_STATUS[c.status]}
                </Tag>
              </span>
              {c.status === "approved" && (
                <span className="text-sm">
                  {c.payback === "refund"
                    ? `${formatMoney(c.resolvedCents ?? 0)} refunded to how you paid.`
                    : `${formatMoney(c.resolvedCents ?? 0)} off your next order with code ${c.voucher?.code}.`}
                </span>
              )}
              {c.decisionNote && (
                <span className="text-muted-foreground text-sm">
                  {c.decisionNote}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {canReport && order.windowEndsAt && (
        <p>
          <Link
            href={`/orders/${encodeURIComponent(orderNo)}/claim`}
            className="decoration-border-strong font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
          >
            Report a problem
          </Link>{" "}
          <span className="text-muted-foreground text-sm">
            until {formatDateTime(order.windowEndsAt)}
          </span>
        </p>
      )}
    </section>
  );
}
