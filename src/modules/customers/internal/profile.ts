import { db } from "@/lib/db";

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Said yes to reminders and offers (ADR 0014). */
  marketingOptIn: boolean;
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
    },
  });
}

/** Change the name we greet the Customer with and print on the Order. */
export async function updateName(
  customerId: string,
  name: string
): Promise<{ ok: true } | { ok: false; errors: { name: string } }> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 1 || clean.length > 80) {
    return { ok: false, errors: { name: "Enter a name up to 80 characters." } };
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
