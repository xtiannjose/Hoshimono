import { db } from "@/lib/db";

import type { PaymentProvider } from "./provider";

/**
 * Where to send the Customer to pay an online Order: its hosted checkout,
 * opened once and reused on a double-click or a return visit. Null when
 * there is nothing to pay (already paid, failed, or not an online Order).
 */
export async function startCheckout(
  provider: PaymentProvider,
  {
    orderId,
    orderNo,
    successUrl,
    cancelUrl,
  }: { orderId: string; orderNo: string; successUrl: string; cancelUrl: string }
): Promise<string | null> {
  const payment = await db.payment.findFirst({
    where: { orderId, provider: provider.name },
  });
  if (!payment || payment.status !== "unpaid" || payment.method === "cod") {
    return null;
  }
  if (payment.checkoutUrl) return payment.checkoutUrl;

  const session = await provider.createCheckout({
    reference: orderNo,
    description: `Hoshimono order ${orderNo}`,
    amountCents: payment.amountCents,
    methods: [payment.method],
    successUrl,
    cancelUrl,
  });
  // Only the first session to land is kept. Any other is expired at once,
  // so it can never take money for an Order that is not waiting for it.
  const { count } = await db.payment.updateMany({
    where: { id: payment.id, providerRef: null },
    data: {
      providerRef: session.providerRef,
      checkoutUrl: session.redirectUrl,
    },
  });
  if (count === 1) return session.redirectUrl;
  await provider.expireCheckout(session.providerRef);
  const kept = await db.payment.findUniqueOrThrow({
    where: { id: payment.id },
    select: { checkoutUrl: true },
  });
  return kept.checkoutUrl;
}
