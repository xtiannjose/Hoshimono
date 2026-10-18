import { toNextJsHandler } from "better-auth/next-js";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import type { StaffRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { auth } from "./internal/auth";
import { customerForUser, staffForUser } from "./internal/link";

export { customerForUser, staffForUser };
export type { AuthUserInfo } from "./internal/link";

/** Better Auth endpoints for /api/auth/[...all]. */
export const authHandler = toNextJsHandler(auth);

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

// Not memoised with React cache: a promise shared between two parts of a
// page is attributed to the prerender and trips Next. Better Auth's session
// cookie cache makes repeat calls cheap instead (internal/auth.ts).
async function currentUser() {
  // Read headers first: touching auth.api starts Better Auth, which reads
  // the clock, and that must not happen while Next prerenders the shell.
  // Headers count as runtime data that Next may still prerender with
  // (partialPrefetching), so connection() marks this truly per request.
  const requestHeaders = await headers();
  await connection();
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user ?? null;
}

/** The signed-in Customer, or a redirect to sign-in. */
export async function requireCustomer(next = "/account") {
  const customer = await currentCustomer();
  if (!customer) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return customer;
}

/** The signed-in Customer, or null for guests. Never redirects. */
export async function currentCustomer() {
  const user = await currentUser();
  return user ? customerForUser(db, user) : null;
}

/** The signed-in Staff member with `role`. Others get a 404, not a hint. */
export async function requireStaff(role: StaffRole, next = "/admin") {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  const staff = await staffForUser(db, user, role);
  if (!staff) notFound();
  return staff;
}

export async function sendSignInLink(email: string, next: string) {
  await auth.api.signInMagicLink({
    body: { email, callbackURL: safeNext(next) },
    headers: await headers(),
  });
}

/** Text a 6-digit sign-in code to a +639XXXXXXXXX number. */
export async function sendSignInCode(phone: string) {
  await auth.api.sendPhoneNumberOTP({
    body: { phoneNumber: phone },
    headers: await headers(),
  });
}

/** Check the code; on success the session cookie is set. */
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
  } catch {
    return false;
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

export { googleEnabled } from "./internal/auth";

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
}
export { recordAudit, recordAudits } from "./internal/audit";

/** The signed-in Staff member with `role`, or null. For route handlers. */
export async function getStaff(role: StaffRole) {
  const user = await currentUser();
  return user ? staffForUser(db, user, role) : null;
}

// Development and end-to-end tests only; off in production.
export { devMailboxEnabled, lastLink } from "./internal/dev-mailbox";
