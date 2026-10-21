"use server";

import { redirect } from "next/navigation";

import { answerSubstitution } from "@/modules/orders";

/**
 * The Customer's yes or no from the link in their SMS or email (ADR 0010).
 * The token is the only key: it opens this one Substitution and no more.
 */
export async function answerAction(token: string, accept: boolean) {
  const answer = await answerSubstitution(token, accept);
  redirect(answer ? `/s/${encodeURIComponent(token)}` : "/");
}
