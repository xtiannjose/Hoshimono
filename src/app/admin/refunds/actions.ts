"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { recordAudits, requireStaff } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import { settleRefund } from "@/modules/payments";

import { jobHandlers } from "@/server/job-handlers";

export type RefundFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/**
 * A person's answer for a refund to check (ADR 0008): it went through
 * (the Customer is told), or send it again.
 */
export async function settleRefundAction(
  refundId: string,
  outcome: "sent" | "retry",
  _prev: RefundFormState,
  fd: FormData
): Promise<RefundFormState> {
  const admin = await requireStaff("refunds", "/admin/refunds");
  const providerRef = text(fd, "providerRef");
  if (!(await settleRefund(refundId, outcome, providerRef))) {
    return { errors: { form: "This refund was already settled. Reload." } };
  }
  // ponytail: audited after the change, not with it; settleRefund keeps its
  // own transaction. Pass a client through if they must commit together.
  await recordAudits([
    {
      staffId: admin.id,
      action: outcome === "sent" ? "refund_confirmed" : "refund_retried",
      entity: "refund",
      entityId: refundId,
      after: providerRef ? { providerRef } : undefined,
    },
  ]);
  after(() => runDueJobs(jobHandlers).then(() => undefined));
  refresh();
  return { errors: {}, saved: true };
}
