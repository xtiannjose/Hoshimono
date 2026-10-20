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
  // Only the first session to land is kept, and only while the Payment is
  // still open (closeOnlinePayment may have closed it meanwhile). Any other
  // is expired at once, so it never takes money for an Order not waiting.
  const { count } = await db.payment.updateMany({
    where: { id: payment.id, providerRef: null, status: "unpaid" },
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

/**
 * Close an Order's unpaid online Payment so it can never take money: expire
 * its hosted checkout, or keep one from opening. False when the provider
 * refuses (paid, or a payment still going through: its webhook settles the
 * Order) or there is nothing to close.
 */
export async function closeOnlinePayment(
  provider: PaymentProvider,
  orderId: string
): Promise<boolean> {
  const payment = await db.payment.findFirst({
    where: { orderId, provider: provider.name },
  });
  if (!payment || payment.method === "cod") return false;
  // Closed on an earlier run that stopped before cancelling the Order.
  if (payment.status === "failed") return true;
  if (payment.status !== "unpaid") return false;
  if (
    payment.providerRef &&
    (await provider.expireCheckout(payment.providerRef)) === "refused"
  ) {
    return false;
  }
  // A session stored since the read above stays open: the next run expires it.
  const { count } = await db.payment.updateMany({
    where: {
      id: payment.id,
      status: "unpaid",
      providerRef: payment.providerRef,
    },
    data: { status: "failed" },
  });
  return count === 1;
}
