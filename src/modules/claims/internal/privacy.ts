import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// A Customer's data on request (ADR 0020): Freshness Claims.

export function claimData(customerId: string) {
  return db.freshnessClaim.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
    select: {
      order: { select: { orderNo: true } },
      reason: true,
      units: true,
      note: true,
      photoUrls: true,
      claimedCents: true,
      status: true,
      resolvedCents: true,
      payback: true,
      decisionNote: true,
      createdAt: true,
      decidedAt: true,
    },
  });
}

/** A claim waiting for staff: the account cannot be deleted until it is decided. */
export async function hasOpenClaim(customerId: string): Promise<boolean> {
  return (
    (await db.freshnessClaim.count({
      where: { customerId, status: "open" },
    })) > 0
  );
}

/**
 * Clears what the Customer wrote and their photos; the decision and the
 * money stay. Returns the photo addresses, to delete once committed.
 */
export async function eraseClaimDetails(
  tx: Prisma.TransactionClient,
  customerId: string
): Promise<string[]> {
  const claims = await tx.freshnessClaim.findMany({
    where: { customerId },
    select: { photoUrls: true },
  });
  await tx.freshnessClaim.updateMany({
    where: { customerId },
    data: { note: "", photoUrls: [] },
  });
  return claims.flatMap((c) => c.photoUrls);
}
