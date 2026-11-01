"use server";

import { redirect } from "next/navigation";

import type { ClaimReason } from "@/generated/prisma/enums";
import { langOf, localPath } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { fileClaim, MAX_PHOTOS, type ClaimProblem } from "@/modules/claims";
import { setCustomerLang } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";

export type ClaimFormState = { errors: Record<string, string> };

const REASONS: ClaimReason[] = [
  "not_fresh",
  "damaged",
  "missing",
  "wrong_item",
];

/**
 * File a Freshness Claim (ADR 0016), then back to the Order. The form sends
 * the page's language, so problems come back in its words (ADR 0017, 0019).
 */
export async function fileClaimAction(
  orderNo: string,
  _prev: ClaimFormState,
  fd: FormData
): Promise<ClaimFormState> {
  const customer = await requireCustomer(`/orders/${orderNo}/claim`);
  const lang = langOf(fd.get("lang"));
  // The decision message follows the language they reported in (ADR 0021).
  await setCustomerLang(customer.id, lang);
  const t = MESSAGES[lang].claims.problems;
  const say = (problem: ClaimProblem) =>
    problem === "too_many_photos" ? t.too_many_photos(MAX_PHOTOS) : t[problem];
  const reason = String(fd.get("reason") ?? "") as ClaimReason;
  if (!REASONS.includes(reason)) return { errors: { reason: t.no_reason } };
  const files = fd
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_PHOTOS)
    return { errors: { photos: say("too_many_photos") } };
  const result = await fileClaim(customer.id, {
    orderLineId: String(fd.get("orderLineId") ?? ""),
    reason,
    units: Number(fd.get("units") ?? 1),
    note: String(fd.get("note") ?? ""),
    photos: await Promise.all(
      files.map(async (f) => Buffer.from(await f.arrayBuffer()))
    ),
  });
  if (!result.ok) {
    return {
      errors: Object.fromEntries(
        Object.entries(result.errors).map(([field, problem]) => [
          field,
          say(problem),
        ])
      ),
    };
  }
  redirect(localPath(lang, `/orders/${encodeURIComponent(orderNo)}#h-problem`));
}
