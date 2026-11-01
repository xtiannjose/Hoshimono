"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { parseMoney } from "@/lib/money";
import type { ClaimReason } from "@/generated/prisma/enums";
import {
  decideClaim,
  fileClaimForCustomer,
  reopenClaim,
  type ClaimProblem,
} from "@/modules/claims";
import { recordAudits, requireStaff } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import { jobHandlers } from "@/server/job-handlers";

export type DecisionState = { errors: Record<string, string>; saved?: boolean };

const REFUSED = {
  not_found: "That claim no longer exists.",
  already_decided: "Someone already decided this claim.",
};

/** Approve (in full or less) or reject a Freshness Claim (ADR 0016), audited. */
export async function decideClaimAction(
  claimId: string,
  approve: boolean,
  _prev: DecisionState,
  fd: FormData
): Promise<DecisionState> {
  const staff = await requireStaff("claims", `/admin/claims/${claimId}`);
  const note = String(fd.get("note") ?? "");
  const decision = approve
    ? {
        approve: true as const,
        amountCents:
          parseMoney(String(fd.get("amount") ?? "").trim()) ?? Number.NaN,
        note,
      }
    : { approve: false as const, note };
  const result = await decideClaim(claimId, staff.id, decision);
  if (!result.ok)
    return "errors" in result
      ? { errors: result.errors }
      : { errors: { form: REFUSED[result.reason] } };
  await recordAudits([
    {
      staffId: staff.id,
      action: approve ? "approve" : "reject",
      entity: "claim",
      entityId: claimId,
      after: decision,
    },
  ]);
  // Send the refund and the Customer's message now; the cron is the net.
  after(() => runDueJobs(jobHandlers).then(() => undefined));
  refresh();
  return { errors: {}, saved: true };
}

/** A rejected claim back to open for another look (ADR 0022), audited. */
export async function reopenClaimAction(
  claimId: string,
  _prev: DecisionState
): Promise<DecisionState> {
  const staff = await requireStaff("claims", `/admin/claims/${claimId}`);
  const result = await reopenClaim(claimId);
  if (!result.ok)
    return {
      errors: {
        form:
          result.reason === "not_found"
            ? REFUSED.not_found
            : "Only a rejected claim can be reopened.",
      },
    };
  await recordAudits([
    { staffId: staff.id, action: "reopen", entity: "claim", entityId: claimId },
  ]);
  refresh();
  return { errors: {}, saved: true };
}

const PROBLEM: Partial<Record<ClaimProblem, string>> = {
  not_found: "Choose one of the Order's items.",
  not_delivered: "Only a delivered Order can have a claim.",
  already_reported: "That item already has a claim.",
  not_charged: "That item was not charged, so there is nothing to pay back.",
  bad_units: "Enter how many, up to what was charged.",
  note_too_long: "Keep the note under 500 characters.",
};
const REASONS: ClaimReason[] = [
  "not_fresh",
  "damaged",
  "missing",
  "wrong_item",
];

/**
 * File a Freshness Claim for a Customer who called or wrote in (ADR 0022),
 * audited, then open it to decide.
 */
export async function fileClaimForCustomerAction(
  orderNo: string,
  _prev: DecisionState,
  fd: FormData
): Promise<DecisionState> {
  const staff = await requireStaff("claims", `/admin/orders/${orderNo}`);
  const reason = String(fd.get("reason") ?? "") as ClaimReason;
  if (!REASONS.includes(reason))
    return { errors: { reason: "Choose what was wrong." } };
  const result = await fileClaimForCustomer({
    orderLineId: String(fd.get("orderLineId") ?? ""),
    reason,
    units: Number(fd.get("units") ?? 1),
    note: String(fd.get("note") ?? ""),
    photos: [],
  });
  if (!result.ok) {
    const [field, code] = Object.entries(result.errors)[0];
    return { errors: { [field]: PROBLEM[code!] ?? "Check the form." } };
  }
  await recordAudits([
    {
      staffId: staff.id,
      action: "file_for_customer",
      entity: "claim",
      entityId: result.id,
    },
  ]);
  redirect(`/admin/claims/${result.id}`);
}
