import type { Lang } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Said yes to reminders and offers (ADR 0014). */
  marketingOptIn: boolean;
  /** The language they last shopped in, for their messages (ADR 0021). */
  lang: Lang;
};

export async function getProfile(customerId: string): Promise<Profile | null> {
  return db.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      marketingOptIn: true,
      lang: true,
    },
  });
}

/**
 * The language the Customer just shopped in: their emails and texts follow
 * it (ADR 0021). Writes only when it changes.
 */
export async function setCustomerLang(
  customerId: string,
  lang: Lang
): Promise<void> {
  await db.customer.updateMany({
    where: { id: customerId, lang: { not: lang } },
    data: { lang },
  });
}

/**
 * Change the name we greet the Customer with and print on the Order. The
 * one problem, "invalid", is 1 to 80 characters; the shop words it (ADR 0019).
 */
export async function updateName(
  customerId: string,
  name: string
): Promise<{ ok: true } | { ok: false; errors: { name: "invalid" } }> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 1 || clean.length > 80) {
    return { ok: false, errors: { name: "invalid" } };
  }
  await db.customer.update({
    where: { id: customerId },
    data: { name: clean },
  });
  return { ok: true };
}

/**
 * Reminders and offers: off until the Customer turns them on (Data Privacy
 * Act; ADR 0014). Order and delivery messages need no consent.
 */
export async function setMarketingOptIn(
  customerId: string,
  on: boolean
): Promise<void> {
  // updateMany: a stop link for an account since deleted does nothing.
  await db.customer.updateMany({
    where: { id: customerId },
    data: { marketingOptIn: on },
  });
}

/**
 * Staff block an account that abuses the shop (docs/security-review.md,
 * M1): it can place no Orders until unblocked. Sign-in still works, so the
 * Customer sees their Orders and why.
 */
export async function setCustomerBlocked(
  customerId: string,
  blocked: boolean
): Promise<void> {
  await db.customer.update({
    where: { id: customerId },
    data: { blockedAt: blocked ? new Date() : null },
  });
}

export async function isCustomerBlocked(customerId: string): Promise<boolean> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { blockedAt: true },
  });
  return !!customer?.blockedAt;
}
