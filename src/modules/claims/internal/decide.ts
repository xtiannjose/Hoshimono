import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { isUuid } from "@/lib/uuid";
import { enqueueJob } from "@/modules/jobs";
import { refundOrderPayment } from "@/modules/payments";
import { createCreditVoucher } from "@/modules/pricing";

// Deciding Freshness Claims (ADR 0016): staff approve (in full or less) or
// reject; the money goes back as a refund, or a Voucher for a cash Order.

export const CLAIM_DECIDED_JOB = "claim.decided";

export type ClaimDecision =
  | { approve: true; amountCents: number; note: string }
  | { approve: false; note: string };

export type DecideResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_decided" }
  | { ok: false; errors: Record<string, string> };

/**
 * Decide an open claim, once: the claim row is locked, so two reviewers at
 * once cannot both pay it. Audited by the caller.
 */
export async function decideClaim(
  claimId: string,
  staffId: string,
  decision: ClaimDecision,
  now = new Date()
): Promise<DecideResult> {
  if (!isUuid(claimId)) return { ok: false, reason: "not_found" };
  const note = decision.note.trim();
  return db.$transaction(async (tx): Promise<DecideResult> => {
    const [claim] = await tx.$queryRaw<
      {
        status: string;
        claimed_cents: number;
        order_id: string;
        customer_id: string;
      }[]
    >`SELECT status, claimed_cents, order_id, customer_id FROM freshness_claims WHERE id = ${claimId}::uuid FOR UPDATE`;
    if (!claim) return { ok: false, reason: "not_found" } as const;
    if (claim.status !== "open")
      return { ok: false, reason: "already_decided" } as const;
    const decided = {
      decidedById: staffId,
      decidedAt: now,
      decisionNote: note,
    };

    if (!decision.approve) {
      if (!note)
        return { ok: false, errors: { note: "Say why, for the Customer." } };
      await tx.freshnessClaim.update({
        where: { id: claimId },
        data: { status: "rejected", ...decided },
      });
    } else {
      const amount = decision.amountCents;
      if (
        !Number.isInteger(amount) ||
        amount < 1 ||
        amount > claim.claimed_cents
      )
        return {
          ok: false,
          errors: {
            amount: `Approve up to ${formatMoney(claim.claimed_cents)}.`,
          },
        };
      // Back to GCash or the card where it was paid online; what cannot
      // be refunded (cash, or nothing left) becomes a Voucher.
      const refunded = await refundOrderPayment(
        tx,
        claim.order_id,
        "claim",
        amount,
        claimId
      );
      const rest = amount - refunded;
      const voucher =
        rest > 0
          ? await createCreditVoucher(tx, claim.customer_id, rest, now)
          : null;
      await tx.freshnessClaim.update({
        where: { id: claimId },
        data: {
          status: "approved",
          resolvedCents: amount,
          payback: refunded > 0 ? "refund" : "voucher",
          voucherId: voucher?.id ?? null,
          ...decided,
        },
      });
    }
    await enqueueJob(tx, CLAIM_DECIDED_JOB, { claimId });
    return { ok: true } as const;
  });
}

/** What the decision message says; null while the claim is open. */
export async function getClaimNotice(claimId: string) {
  if (!isUuid(claimId)) return null;
  const claim = await db.freshnessClaim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      status: true,
      resolvedCents: true,
      payback: true,
      decisionNote: true,
      voucher: { select: { code: true, endsAt: true } },
      refund: { select: { amountCents: true } },
      orderLine: { select: { nameSnapshot: true } },
      order: {
        select: {
          orderNo: true,
          contactPhone: true,
          payments: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { method: true },
          },
        },
      },
      customer: { select: { name: true, email: true } },
    },
  });
  if (!claim || claim.status === "open") return null;
  return claim;
}

// ---------- staff ----------

const listSelect = {
  id: true,
  reason: true,
  units: true,
  status: true,
  claimedCents: true,
  resolvedCents: true,
  createdAt: true,
  orderLine: { select: { nameSnapshot: true } },
  order: { select: { orderNo: true } },
  customer: { select: { name: true } },
} as const;

/** Open claims oldest first, or decided ones newest first. */
export async function listClaimsForStaff(which: "open" | "decided") {
  return db.freshnessClaim.findMany({
    where: which === "open" ? { status: "open" } : { status: { not: "open" } },
    orderBy: { createdAt: which === "open" ? "asc" : "desc" },
    take: 100,
    select: listSelect,
  });
}

/** One claim with its photos, the line and how the Order was paid. */
export async function getClaimForStaff(claimId: string) {
  if (!isUuid(claimId)) return null;
  return db.freshnessClaim.findUnique({
    where: { id: claimId },
    select: {
      ...listSelect,
      note: true,
      photoUrls: true,
      payback: true,
      decisionNote: true,
      decidedAt: true,
      decidedBy: { select: { name: true } },
      voucher: { select: { code: true } },
      orderLine: {
        select: {
          nameSnapshot: true,
          orderedQty: true,
          fulfilledQty: true,
          orderedWeightGrams: true,
          finalWeightGrams: true,
        },
      },
      order: {
        select: {
          orderNo: true,
          deliveredAt: true,
          payments: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { method: true },
          },
        },
      },
    },
  });
}
