"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { langOf, localPath } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { setMarketingOptIn, updateName } from "@/modules/customers";
import { requireCustomer, signOut } from "@/modules/identity";
import { eraseCustomer } from "@/server/customer-data";

// Server Actions cannot read the language; forms send it (ADR 0017).

export async function signOutAction(fd: FormData) {
  await signOut();
  redirect(localPath(langOf(fd.get("lang")), "/"));
}

export type DeleteState = {
  problem?: "confirm" | "open_orders" | "claim_open";
};

/** "Delete my account" (ADR 0020): the person goes, the tax record stays. */
export async function deleteAccountAction(
  _prev: DeleteState,
  fd: FormData
): Promise<DeleteState> {
  const customer = await requireCustomer("/account");
  if (fd.get("confirm") !== "yes") return { problem: "confirm" };
  const erased = await eraseCustomer(customer.id);
  if (!erased.ok) return { problem: erased.reason };
  // The sign-in is gone with its sessions; this clears the cookies.
  await signOut().catch(() => {});
  redirect(localPath(langOf(fd.get("lang")), "/goodbye"));
}

export type NameState = { message?: string; saved?: boolean; name?: string };

export async function saveNameAction(
  _prev: NameState,
  fd: FormData
): Promise<NameState> {
  const customer = await requireCustomer("/account");
  const name = String(fd.get("name") ?? "");
  const result = await updateName(customer.id, name);
  return result.ok
    ? { saved: true, name }
    : { message: MESSAGES[langOf(fd.get("lang"))].account.nameInvalid, name };
}

/** "Send me reminders and offers" on or off (ADR 0014). */
export async function setRemindersAction(on: boolean): Promise<void> {
  const customer = await requireCustomer("/account");
  await setMarketingOptIn(customer.id, on);
  refresh();
}
