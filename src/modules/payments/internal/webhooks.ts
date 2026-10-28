import type { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { addDays, addMinutes } from "@/lib/dates";
import { db } from "@/lib/db";

import type { PaymentProvider } from "./provider";
import { requestRefund } from "./refunds";

/** What happened to one delivery; every value but "rejected" is acknowledged. */
export type WebhookResult =
  | "rejected"
  | "duplicate"
  | "unmatched"
  | "recorded"
  | "mismatch"
  | "late"
  | "applied";

export type WebhookOptions = {
  /**
   * Runs inside the webhook's transaction once a Payment is marked paid, so
   * the Order and its Payment change together (the orders module confirms
   * the Order). "late": the Order is no longer waiting for this money.
   */
  onPaid?: (
    tx: Prisma.TransactionClient,
    paid: { orderId: string }
  ) => Promise<"confirmed" | "late">;
};

/**
 * Verify, record, then apply one provider webhook (docs/03 section 8).
 * The signature is checked before anything else is read.
 */
export async function handleWebhook(
  provider: PaymentProvider,
  rawBody: string,
  headers: Headers,
  { onPaid }: WebhookOptions = {}
): Promise<WebhookResult> {
  if (!provider.verifyWebhook(rawBody, headers)) return "rejected";
  const event = provider.parseEvent(rawBody);

  return db.$transaction(async (tx) => {
    // The unique (provider, provider_event_id) decides: a repeat, even one
    // arriving at the same moment, inserts nothing and changes nothing.
    const { count } = await tx.paymentEvent.createMany({
      data: {
        provider: provider.name,
        providerEventId: event.id,
        type: event.type,
        payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
      },
      skipDuplicates: true,
    });
    if (count === 0) return "duplicate";
    const recorded = {
      provider_providerEventId: {
        provider: provider.name,
        providerEventId: event.id,
      },
    };
    const payment = await tx.payment.findFirst({
      where: { provider: provider.name, providerRef: event.providerRef },
    });
    // Kept unprocessed, for someone to look at: nothing here matches it.
    if (!payment) return "unmatched";
    await tx.paymentEvent.update({
      where: recorded,
      data: { paymentId: payment.id },
    });
    if (event.kind !== "paid") return "recorded";
    // Already paid by an earlier event for the same checkout: applying it
    // again would refund the Order as "late" (a failed Payment, closed by
    // the Payment Window, still takes the money and refunds it).
    if (ALREADY_APPLIED.includes(payment.status)) return "recorded";
    // Never mark paid on an amount the Order did not ask for.
    if (event.amountCents !== payment.amountCents) {
      console.error(
        `[payments] ${provider.name} event ${event.id} paid ${event.amountCents}, Payment ${payment.id} expects ${payment.amountCents}`
      );
      return "mismatch";
    }
    await tx.paymentEvent.update({
      where: recorded,
      data: { processedAt: new Date() },
    });
    return applyPaid(tx, payment, event.paymentRef, onPaid);
  });
}

const ALREADY_APPLIED: PaymentStatus[] = [
  "paid",
  "partially_refunded",
  "refunded",
];

/**
 * Marks the Payment paid for what it asked, then lets the orders module
 * confirm the Order; money for an Order no longer waiting goes straight
 * back (ADR 0008).
 */
async function applyPaid(
  tx: Prisma.TransactionClient,
  payment: { id: string; orderId: string; amountCents: number },
  paymentRef: string | null,
  onPaid: WebhookOptions["onPaid"]
): Promise<"applied" | "late"> {
  await tx.payment.update({
    where: { id: payment.id },
    data: { status: "paid", capturedCents: payment.amountCents, paymentRef },
  });
  if (onPaid && (await onPaid(tx, payment)) === "late") {
    await requestRefund(tx, payment.id, "late_payment");
    console.error(
      `[payments] Payment ${payment.id} paid after its Order closed: refunding it`
    );
    return "late";
  }
  return "applied";
}

/**
 * Staff saw the money in the provider's dashboard, but no verified webhook
 * applied it (docs/runbook.md, 1a): the same as a paid webhook, for the
 * amount the Payment asked for. "not_waiting" when the Order has no online
 * Payment still unpaid or closed unpaid.
 */
export async function recordPaidByStaff(
  orderId: string,
  paymentRef: string,
  { onPaid }: WebhookOptions = {}
): Promise<"applied" | "late" | "not_waiting"> {
  return db.$transaction(async (tx) => {
    const [payment] = await tx.$queryRaw<
      { id: string; order_id: string; amount_cents: number }[]
    >`SELECT id, order_id, amount_cents FROM payments
      WHERE order_id = ${orderId}::uuid AND method <> 'cod'
        AND status IN ('unpaid', 'failed')
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE`;
    if (!payment) return "not_waiting";
    return applyPaid(
      tx,
      {
        id: payment.id,
        orderId: payment.order_id,
        amountCents: payment.amount_cents,
      },
      paymentRef.trim() || null,
      onPaid
    );
  });
}

/**
 * For the alerting health check: provider events from the last day that
 * match no Payment (kept for someone to look at), and Refunds waiting for
 * staff at /admin/refunds.
 */
export async function paymentsHealth(
  now = new Date()
): Promise<{ unmatchedEvents: number; refundsToCheck: number }> {
  const [unmatchedEvents, refundsToCheck] = await Promise.all([
    db.paymentEvent.count({
      where: {
        paymentId: null,
        receivedAt: { gt: addDays(now, -1), lt: addMinutes(now, -10) },
      },
    }),
    db.refund.count({ where: { status: "needs_review" } }),
  ]);
  return { unmatchedEvents, refundsToCheck };
}
