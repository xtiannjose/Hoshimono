import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// A Customer's data on request (ADR 0020): the log of messages sent.

const sentTo = (customerId: string, recipients: string[]) => ({
  OR: [{ recipient: { in: recipients } }, { order: { customerId } }],
});

/** Messages about the Customer's Orders, or to their email or mobile. */
export function messageData(customerId: string, recipients: string[]) {
  return db.notification.findMany({
    where: sentTo(customerId, recipients),
    orderBy: { createdAt: "asc" },
    select: { template: true, channel: true, recipient: true, createdAt: true },
  });
}

/** Keeps that a message went out, not to whom. */
export async function eraseRecipients(
  tx: Prisma.TransactionClient,
  customerId: string,
  recipients: string[]
): Promise<void> {
  await tx.notification.updateMany({
    where: sentTo(customerId, recipients),
    data: { recipient: "deleted" },
  });
}
