import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// A Customer's data on request (ADR 0020): what this module keeps, and
// how it forgets the person.

export async function customerProfileData(customerId: string) {
  const [profile, addresses] = await Promise.all([
    db.customer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        email: true,
        phone: true,
        marketingOptIn: true,
        lang: true,
        referralCode: true,
        createdAt: true,
      },
    }),
    db.address.findMany({
      where: { customerId },
      orderBy: { createdAt: "asc" },
      select: {
        label: true,
        line1: true,
        barangay: true,
        city: true,
        landmark: true,
        notes: true,
        isDefault: true,
      },
    }),
  ]);
  return { profile, addresses };
}

/**
 * Empties the Customer row and deletes the addresses. The row stays,
 * because Orders keep pointing at it. Returns how the person was reached
 * and their sign-in, for the other modules to forget too.
 */
export async function eraseCustomerProfile(
  tx: Prisma.TransactionClient,
  customerId: string
) {
  const before = await tx.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { email: true, phone: true, authUserId: true },
  });
  await tx.address.deleteMany({ where: { customerId } });
  await tx.customer.update({
    where: { id: customerId },
    data: {
      name: "Deleted customer",
      email: null,
      phone: null,
      authUserId: null,
      marketingOptIn: false,
      referralCode: null,
    },
  });
  return before;
}
