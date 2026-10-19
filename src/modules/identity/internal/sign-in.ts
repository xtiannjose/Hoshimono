import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { auth } from "./auth";

/**
 * Only same-site paths, so `?next=` cannot redirect to another site. Control
 * characters and backslashes are refused outright: browsers drop tabs and
 * newlines, which would turn "/\t/evil.example" into "//evil.example".
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) {
    return "/account";
  }
  const url = new URL(next, "https://same.site");
  return url.origin === "https://same.site" && !next.startsWith("//")
    ? next
    : "/account";
}

/** Email a sign-in link that returns to `next`. */
export async function emailSignInLink(email: string, next: string) {
  await auth.api.signInMagicLink({
    body: { email, callbackURL: safeNext(next) },
    headers: await headers(),
  });
}

/** Text a 6-digit sign-in code to a +639XXXXXXXXX number. */
export async function textSignInCode(phone: string) {
  await auth.api.sendPhoneNumberOTP({
    body: { phoneNumber: phone },
    headers: await headers(),
  });
}

/**
 * Check the code; on success the session cookie is set. False only when
 * Better Auth refuses the code; anything else (a database outage) throws,
 * so it is never shown as a wrong code.
 */
export async function verifySignInCode(
  phone: string,
  code: string
): Promise<boolean> {
  try {
    await auth.api.verifyPhoneNumber({
      body: { phoneNumber: phone, code },
      headers: await headers(),
    });
    return true;
  } catch (error) {
    if (error instanceof APIError) return false;
    throw error;
  }
}

/** Where to send the browser to sign in with Google. */
export async function googleSignInUrl(next: string): Promise<string | null> {
  const result = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: safeNext(next) },
    headers: await headers(),
  });
  return result.url ?? null;
}
