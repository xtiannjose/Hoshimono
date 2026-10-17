"use server";

import { redirect } from "next/navigation";

import { signOut } from "@/modules/identity";

export async function signOutAction() {
  await signOut();
  redirect("/");
}
