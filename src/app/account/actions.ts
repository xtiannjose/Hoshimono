"use server";

import { redirect } from "next/navigation";

import { updateName } from "@/modules/customers";
import { requireCustomer, signOut } from "@/modules/identity";

export async function signOutAction() {
  await signOut();
  redirect("/");
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
    : { message: result.errors.name, name };
}
