import type { Prisma } from "@/generated/prisma/client";
import type {
  PaymentMethod,
  RefundReason,
  RefundStatus,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { enqueueJob } from "@/modules/jobs";

import { paymentProvider } from "./active";
import type { PaymentProvider } from "./provider";

/** Sends one Refund to the provider (sendRefund), then tells the Customer. */
export const REFUND_JOB = "payment.refund";

/**
 * Owe the Customer part of a Payment (all that is left by default), in the
 * caller's transaction (ADR 0008). Recorded once per Payment and reason, or
 * once per Freshness Claim (ADR 0016), never past what was captured, and
 * sent by REFUND_JOB after commit. Returns the amount now owed: 0 when
 * nothing is.
 */
export async function requestRefund(
  tx: Prisma.TransactionClient,
  paymentId: string,
  reason: RefundReason,
  amountCents?: number,
  claimId?: string
): Promise<number> {
  if ((reason === "claim") !== Boolean(claimId))
    throw new Error("A claim refund, and only one, names its claim");
  // Row lock: two triggers at once cannot both take the same remainder.
  const [payment] = await tx.$queryRaw<
    { captured_cents: number; refunded_cents: number }[]
  >`SELECT captured_cents, refunded_cents FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
  const left = payment.captured_cents - payment.refunded_cents;
  const amount = Math.min(amountCents ?? left, left);
  if (amount <= 0) return 0;
  const { count } = await tx.refund.createMany({
    data: { paymentId, reason, amountCents: amount, claimId: claimId ?? null },
    skipDuplicates: true,
  });
  if (count === 0) return 0;
  const refunded = payment.refunded_cents + amount;
  await tx.payment.update({
    where: { id: paymentId },
    data: {
      refundedCents: refunded,
      status:
        refunded === payment.captured_cents ? "refunded" : "partially_refunded",
    },
  });
  const refund = await tx.refund.findFirstOrThrow({
    where: claimId ? { claimId } : { paymentId, reason, claimId: null },
    select: { id: true },
  });
  await enqueueJob(tx, REFUND_JOB, { refundId: refund.id });
  return amount;
}

/** requestRefund for an Order's online Payment; 0 when it has none paid (COD). */
export async function refundOrderPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
  reason: RefundReason,
  amountCents?: number,
  claimId?: string
): Promise<number> {
  const payment = await tx.payment.findFirst({
    where: { orderId, method: { not: "cod" }, capturedCents: { gt: 0 } },
    select: { id: true },
  });
  return payment
    ? requestRefund(tx, payment.id, reason, amountCents, claimId)
    : 0;
}

/**
 * Send one Refund, at most once (job REFUND_JOB). A clear no from the
 * provider puts it back to pending and throws, so the job tries again. No
 * answer, or a run cut off mid-send, makes it needs_review: a person checks
 * with the provider, since a refund cannot be undone.
 */
export async function sendRefund(
  refundId: string,
  providerFor: (name: string) => PaymentProvider | null = paymentProvider
): Promise<void> {
  const [claimed] = await db.$queryRaw<{ id: string }[]>`
    UPDATE refunds SET status = 'sending'
    WHERE id = ${refundId}::uuid AND status = 'pending'
    RETURNING id`;
  if (!claimed) {
    // Still sending means an earlier run stopped mid-call (jobs never overlap).
    const { count } = await db.refund.updateMany({
      where: { id: refundId, status: "sending" },
      data: { status: "needs_review" },
    });
    if (count > 0) {
      console.error(
        `[payments] refund ${refundId} was cut off while sending: check it with the provider`
      );
    }
    return;
  }
  const refund = await db.refund.findUniqueOrThrow({
    where: { id: refundId },
    include: { payment: { select: { provider: true, paymentRef: true } } },
  });
  const { provider: name, paymentRef } = refund.payment;
  const provider = name ? providerFor(name) : null;
  if (!provider || !paymentRef) {
    await db.refund.update({
      where: { id: refundId },
      data: {
        status: "pending",
        lastError: `No ${provider ? "payment reference" : "provider"} to refund through`,
      },
    });
    throw new Error(`Refund ${refundId} cannot be sent yet`);
  }

  let result: Awaited<ReturnType<PaymentProvider["refund"]>>;
  try {
    result = await provider.refund(
      paymentRef,
      refund.amountCents,
      `Hoshimono refund: ${refund.reason}`
    );
  } catch (error) {
    await db.refund.update({
      where: { id: refundId },
      data: { status: "needs_review", lastError: String(error).slice(0, 2000) },
    });
    console.error(
      `[payments] refund ${refundId}: no clear answer from ${provider.name}; check it before sending again:`,
      error
    );
    return;
  }
  if (!result.ok) {
    await db.refund.update({
      where: { id: refundId },
      data: { status: "pending", lastError: result.reason },
    });
    throw new Error(result.reason);
  }
  await db.refund.update({
    where: { id: refundId },
    data: {
      status: "sent",
      providerRef: result.refundRef,
      sentAt: new Date(),
      lastError: null,
    },
  });
}

/** What the Customer's refund notice needs; null for an unknown id. */
export async function getRefundNotice(refundId: string): Promise<{
  orderId: string;
  amountCents: number;
  reason: RefundReason;
  status: RefundStatus;
  method: PaymentMethod;
} | null> {
  const refund = await db.refund.findUnique({
    where: { id: refundId },
    select: {
      amountCents: true,
      reason: true,
      status: true,
      payment: { select: { orderId: true, method: true } },
    },
  });
  return refund
    ? {
        orderId: refund.payment.orderId,
        amountCents: refund.amountCents,
        reason: refund.reason,
        status: refund.status,
        method: refund.payment.method,
      }
    : null;
}

export type RefundToCheck = {
  id: string;
  amountCents: number;
  reason: RefundReason;
  status: RefundStatus;
  lastError: string | null;
  createdAt: Date;
  method: PaymentMethod;
  /** The provider's payment id, to find it in its dashboard. */
  paymentRef: string | null;
  orderNo: string;
};

/**
 * Refunds a person must look at (ADR 0008): no clear answer from the
 * provider (needs_review), or still refused after the job's tries.
 */
export async function listRefundsToCheck(): Promise<RefundToCheck[]> {
  const rows = await db.refund.findMany({
    where: {
      OR: [
        { status: "needs_review" },
        { status: "pending", lastError: { not: null } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      amountCents: true,
      reason: true,
      status: true,
      lastError: true,
      createdAt: true,
      // shortcut: the Order Number through the relation, as orders/read.ts does.
      payment: {
        select: {
          method: true,
          paymentRef: true,
          order: { select: { orderNo: true } },
        },
      },
    },
  });
  return rows.map(({ payment, ...r }) => ({
    ...r,
    method: payment.method,
    paymentRef: payment.paymentRef,
    orderNo: payment.order.orderNo,
  }));
}

/**
 * A person's answer for a refund to check. "sent": the provider shows it
 * went through (the Customer is then told); "retry": it did not, send it
 * again. False when the refund is not waiting for an answer.
 */
export async function settleRefund(
  refundId: string,
  outcome: "sent" | "retry",
  providerRef?: string
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.refund.updateMany({
      where: { id: refundId, status: { in: ["needs_review", "pending"] } },
      data:
        outcome === "sent"
          ? {
              status: "sent",
              sentAt: new Date(),
              providerRef: providerRef?.trim() || null,
              lastError: null,
            }
          : { status: "pending", lastError: null },
    });
    if (count === 0) return false;
    // Sent: the job only tells the Customer. Retry: the job sends it.
    await enqueueJob(tx, REFUND_JOB, { refundId });
    return true;
  });
}
