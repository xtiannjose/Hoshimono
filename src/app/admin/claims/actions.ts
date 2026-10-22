"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { parseMoney } from "@/lib/money";
import { decideClaim } from "@/modules/claims";
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
