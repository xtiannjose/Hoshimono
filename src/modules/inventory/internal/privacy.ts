import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// A Customer's data on request (ADR 0020): Stock Alerts.

export function stockAlertData(customerId: string) {
  return db.stockAlert.findMany({
    where: { customerId },
    select: { createdAt: true, product: { select: { name: true } } },
  });
}

export async function eraseStockAlerts(
  tx: Prisma.TransactionClient,
  customerId: string
): Promise<void> {
  await tx.stockAlert.deleteMany({ where: { customerId } });
}
