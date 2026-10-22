import type { ClaimReason, ClaimStatus } from "@/generated/prisma/enums";

/** A claim's reason in words, for staff and Customers (ADR 0016). */
export const CLAIM_REASON: Record<ClaimReason, string> = {
  not_fresh: "Spoiled or not fresh",
  damaged: "Damaged",
  missing: "Missing",
  wrong_item: "Wrong item",
};

export const CLAIM_STATUS: Record<ClaimStatus, string> = {
  open: "Waiting for review",
  approved: "Approved",
  rejected: "Not approved",
};
