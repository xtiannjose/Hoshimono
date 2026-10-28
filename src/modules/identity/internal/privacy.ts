import type { Prisma } from "@/generated/prisma/client";

/**
 * Deletes a Customer's sign-in and its sessions (ADR 0020). A sign-in that
 * a Staff member also uses is kept: only the Customer side goes.
 */
export async function deleteCustomerSignIn(
  tx: Prisma.TransactionClient,
  authUserId: string
): Promise<void> {
  if (await tx.staff.count({ where: { authUserId } })) return;
  await tx.authUser.deleteMany({ where: { id: authUserId } });
}
