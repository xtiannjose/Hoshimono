"use server";

import { redirect } from "next/navigation";

import { verifySigned } from "@/lib/signed";
import { setMarketingOptIn } from "@/modules/customers";

/**
 * The stop link in a Cart Reminder (ADR 0014): signed, so it works without
 * signing in; a button press, so mail scanners following links change nothing.
 */
export async function stopRemindersAction(token: string): Promise<void> {
  const customerId = verifySigned(token);
  if (customerId) await setMarketingOptIn(customerId, false);
  redirect(customerId ? `/stop/${token}?done=1` : "/");
}
