import { db } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { enqueueJob } from "@/modules/jobs";

// Stock Alerts: "tell me when it's back" (ADR 0014).

export const STOCK_ALERT_JOB = "stock.back";
const ALERT_DAYS = 30;

/** True once the Customer has an alert for the Product (asking twice is fine). */
export async function requestStockAlert(
  customerId: string,
  productId: string
): Promise<boolean> {
  if (!isUuid(productId)) return false;
  const product = await db.product.count({
    where: { id: productId, status: "active" },
  });
  if (!product) return false;
  await db.stockAlert.upsert({
    where: { customerId_productId: { customerId, productId } },
    create: { customerId, productId },
    update: {},
  });
  return true;
}

export async function cancelStockAlert(
  customerId: string,
  productId: string
): Promise<void> {
  if (!isUuid(productId)) return;
  await db.stockAlert.deleteMany({ where: { customerId, productId } });
}

export async function hasStockAlert(
  customerId: string,
  productId: string
): Promise<boolean> {
  if (!isUuid(productId)) return false;
  return (await db.stockAlert.count({ where: { customerId, productId } })) > 0;
}

/**
 * For the cron: end alerts older than 30 days unsent, then queue one
 * message for each alert whose Product the Hub has free again, ending the
 * alert in the same transaction. Returns how many were queued.
 */
export async function queueStockAlerts(
  hubId: string,
  now = new Date()
): Promise<number> {
  const expired = new Date(now.getTime() - ALERT_DAYS * 24 * 60 * 60 * 1000);
  return db.$transaction(async (tx) => {
    await tx.stockAlert.deleteMany({ where: { createdAt: { lt: expired } } });
    const due = await tx.$queryRaw<
      { id: string; customer_id: string; product_id: string }[]
    >`
      SELECT a.id, a.customer_id, a.product_id
      FROM stock_alerts a
      JOIN stock_levels s ON s.product_id = a.product_id AND s.hub_id = ${hubId}::uuid
      JOIN products p ON p.id = a.product_id AND p.status = 'active'
      WHERE s.on_hand - s.reserved > 0
      FOR UPDATE OF a SKIP LOCKED`;
    for (const a of due) {
      await tx.stockAlert.delete({ where: { id: a.id } });
      await enqueueJob(tx, STOCK_ALERT_JOB, {
        alertId: a.id,
        customerId: a.customer_id,
        productId: a.product_id,
      });
    }
    return due.length;
  });
}
