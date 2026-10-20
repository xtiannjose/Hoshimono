import type { Prisma } from "@/generated/prisma/client";

/** The provider name stored on online Payments: PAYMENT_PROVIDER (ADR 0003). */
export function activeProviderName(): string {
  return process.env.PAYMENT_PROVIDER ?? "paymongo";
}

/**
 * The online Payment for a new Order, in its transaction. Unpaid, with no
 * provider reference until the Customer is sent to pay (startCheckout).
 */
export async function createOnlinePayment(
  tx: Prisma.TransactionClient,
  {
    orderId,
    method,
    amountCents,
  }: { orderId: string; method: "gcash" | "card"; amountCents: number }
): Promise<void> {
  await tx.payment.create({
    data: {
      orderId,
      provider: activeProviderName(),
      method,
      amountCents,
      status: "unpaid",
    },
  });
}
