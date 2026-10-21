import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { customerForUser } from "@/modules/customers";

import { auth } from "./auth";
import { activeStaff, staffForUser, type StaffArea } from "./link";

// Not memoised with React cache: a promise shared between two parts of a
// page is attributed to the prerender and trips Next. Better Auth's session
// cookie cache makes repeat calls cheap instead (auth.ts).
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

/** The signed-in Staff member who may open `area`. Others get a 404, not a hint. */
export async function requireStaff(area: StaffArea, next = "/admin") {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  const staff = await staffForUser(db, user, area);
  if (!staff) notFound();
  return staff;
}

/** The signed-in Staff member who may open `area`, or null. For route handlers. */
export async function getStaff(area: StaffArea) {
  const user = await currentUser();
  return user ? staffForUser(db, user, area) : null;
}

/** The signed-in active Staff member, any role. Others get a 404. */
export async function requireAnyStaff(next = "/admin") {
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  const staff = await activeStaff(db, user);
  if (!staff) notFound();
  return staff;
}

/** The signed-in active Staff member, any role, or null (the staff menu). */
export async function currentStaff() {
  const user = await currentUser();
  return user ? activeStaff(db, user) : null;
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
}
