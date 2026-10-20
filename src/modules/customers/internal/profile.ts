import { db } from "@/lib/db";

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export async function getProfile(customerId: string): Promise<Profile | null> {
  return db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, email: true, phone: true },
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
