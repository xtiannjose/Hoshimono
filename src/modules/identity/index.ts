import { toNextJsHandler } from "better-auth/next-js";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import type { StaffRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { auth } from "./internal/auth";
import { customerForUser, staffForUser } from "./internal/link";

export { customerForUser, staffForUser };
export type { AuthUserInfo } from "./internal/link";

/** Better Auth endpoints for /api/auth/[...all]. */
export const authHandler = toNextJsHandler(auth);

/** Only same-site paths, so `?next=` cannot redirect to another site. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/account";
}

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** The signed-in Customer, or a redirect to sign-in. */
export async function requireCustomer(next = "/account") {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return customerForUser(db, user);
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

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
}
export { recordAudit } from "./internal/audit";

/** The signed-in Staff member with `role`, or null. For route handlers. */
export async function getStaff(role: StaffRole) {
  const user = await currentUser();
  return user ? staffForUser(db, user, role) : null;
}

// Development and end-to-end tests only; off in production.
export { devMailboxEnabled, lastLink } from "./internal/dev-mailbox";
