"use server";

import { notFound, redirect } from "next/navigation";

import { fakePaidWebhook, paymentProvider } from "@/modules/payments";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Only back into this app: the return URLs come from the query string. */
function local(value: FormDataEntryValue | null): string {
  const url = new URL(String(value ?? "/"), appUrl());
  return url.origin === new URL(appUrl()).origin
    ? `${url.pathname}${url.search}`
    : "/";
}

/** Pay: send the signed webhook PayMongo would, then return like PayMongo. */
export async function standInPayAction(fd: FormData): Promise<void> {
  if (!paymentProvider("fake")) notFound();
  const { body, headers } = fakePaidWebhook(
    String(fd.get("ref") ?? ""),
    Number(fd.get("amount"))
  );
  const response = await fetch(new URL("/api/webhooks/fake", appUrl()), {
    method: "POST",
    body,
    headers,
  });
  if (!response.ok) {
    throw new Error(`The stand-in webhook was answered ${response.status}`);
  }
  redirect(local(fd.get("success")));
}

/** Fail: a declined card or a closed wallet, back to the cancel URL. */
export async function standInFailAction(fd: FormData): Promise<void> {
  if (!paymentProvider("fake")) notFound();
  redirect(local(fd.get("cancel")));
}
