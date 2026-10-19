import type { Prisma } from "@/generated/prisma/client";

/** The cash-on-delivery Payment for a new Order, in its transaction. */
export async function createCodPayment(
  tx: Prisma.TransactionClient,
  { orderId, amountCents }: { orderId: string; amountCents: number }
): Promise<void> {
  await tx.payment.create({
    data: { orderId, method: "cod", amountCents, status: "cod_pending" },
  });
}

/**
 * A cancelled cash-on-delivery Order owes nothing: its pending COD Payment
 * becomes unpaid, so the Rider's cash count does not expect it (docs/03
 * section 8). Online Payments are refunded through payments.refund (Phase 3).
 */
export async function voidCodPayment(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<boolean> {
  const { count } = await tx.payment.updateMany({
    where: { orderId, method: "cod", status: "cod_pending" },
    data: { status: "unpaid" },
  });
  return count > 0;
}
