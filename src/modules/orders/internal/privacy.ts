import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { OPEN_STATUSES } from "./status";

// A Customer's data on request (ADR 0020). Orders are kept for the tax
// record (what was sold, when, for how much); the person is taken out.

export function orderData(customerId: string) {
  return db.order.findMany({
    where: { customerId },
    orderBy: { placedAt: "asc" },
    select: {
      orderNo: true,
      status: true,
      placedAt: true,
      deliveredAt: true,
      addressSnapshot: true,
      contactPhone: true,
      riderNotes: true,
      subtotalCents: true,
      discountCents: true,
      deliveryFeeCents: true,
      totalCents: true,
      finalTotalCents: true,
      lines: {
        select: {
          nameSnapshot: true,
          orderedQty: true,
          unitPriceCents: true,
          lineTotalCents: true,
          note: true,
        },
      },
      statusEvents: { orderBy: { at: "asc" }, select: { to: true, at: true } },
    },
  });
}

/** An Order still on its way: the account cannot be deleted until it ends. */
export async function hasOpenOrders(customerId: string): Promise<boolean> {
  return (
    (await db.order.count({
      where: { customerId, status: { in: OPEN_STATUSES } },
    })) > 0
  );
}

/** Takes the person out of their Orders: contact, address, notes, PIN. */
export async function eraseOrderContacts(
  tx: Prisma.TransactionClient,
  customerId: string
): Promise<void> {
  await tx.order.updateMany({
    where: { customerId },
    data: {
      contactPhone: "",
      addressSnapshot: {},
      riderNotes: null,
      deliveryPin: null,
    },
  });
  await tx.orderLine.updateMany({
    where: { order: { customerId } },
    data: { note: null },
  });
}
