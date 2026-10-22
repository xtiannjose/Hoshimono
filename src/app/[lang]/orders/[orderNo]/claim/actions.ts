"use server";

import { redirect } from "next/navigation";

import type { ClaimReason } from "@/generated/prisma/enums";
import { fileClaim, MAX_PHOTOS } from "@/modules/claims";
import { requireCustomer } from "@/modules/identity";

export type ClaimFormState = { errors: Record<string, string> };

const REASONS: ClaimReason[] = [
  "not_fresh",
  "damaged",
  "missing",
  "wrong_item",
];

/** File a Freshness Claim (ADR 0016), then back to the Order. */
export async function fileClaimAction(
  orderNo: string,
  _prev: ClaimFormState,
  fd: FormData
): Promise<ClaimFormState> {
  const customer = await requireCustomer(`/orders/${orderNo}/claim`);
  const reason = String(fd.get("reason") ?? "") as ClaimReason;
  if (!REASONS.includes(reason))
    return { errors: { reason: "Choose what was wrong." } };
  const files = fd
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS)
    return { errors: { photos: `Add up to ${MAX_PHOTOS} photos.` } };
  const result = await fileClaim(customer.id, {
    orderLineId: String(fd.get("orderLineId") ?? ""),
    reason,
    units: Number(fd.get("units") ?? 1),
    note: String(fd.get("note") ?? ""),
    photos: await Promise.all(
      files.map(async (f) => Buffer.from(await f.arrayBuffer()))
    ),
  });
  if (!result.ok) return { errors: result.errors };
  redirect(`/orders/${encodeURIComponent(orderNo)}#h-problem`);
}
