import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendOnce } from "./send-once";

export type OrderConfirmedNotice = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
  /** Such as "Today, 2:00 to 4:00 PM". */
  slot: string;
  total: string;
  trackingUrl: string;
  lines: { name: string; quantity: number }[];
  cashOnDelivery: boolean;
  /** The Order has Weighed Products, so the total is an estimate. */
  estimated: boolean;
};

const TEMPLATE = "order_confirmed";

/**
 * Order confirmed email and SMS (PRD CHK-4). Each channel is logged once
 * sent, so a retried job only sends what is missing.
 */
export async function sendOrderConfirmed(
  notice: OrderConfirmedNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  // Weighed Products are charged by the packed weight (CLAUDE.md), so the
  // amount here is an estimate and must say so.
  const pay = notice.estimated
    ? notice.cashOnDelivery
      ? `Please have about ${notice.total} ready in cash. The final amount follows the weight we pack.`
      : `Estimated total ${notice.total}. The final amount follows the weight we pack.`
    : notice.cashOnDelivery
      ? `Please have ${notice.total} ready in cash for the Rider.`
      : `Total ${notice.total}.`;
  const { orderId } = notice;

  if (notice.email) {
    const to = notice.email;
    await sendOnce(
      { template: TEMPLATE, channel: "email", orderId, recipient: to },
      () =>
        (providers.email ?? emailProvider()).send({
          to,
          subject: `Order ${notice.orderNo} is confirmed`,
          text: [
            `Salamat! We got your order ${notice.orderNo}.`,
            "",
            `Delivery: ${notice.slot}`,
            pay,
            "",
            ...notice.lines.map((l) => `${l.quantity} x ${l.name}`),
            "",
            `Track your order: ${notice.trackingUrl}`,
          ].join("\n"),
        })
    );
  }

  await sendOnce(
    { template: TEMPLATE, channel: "sms", orderId, recipient: notice.phone },
    () =>
      (providers.sms ?? smsProvider()).send({
        to: notice.phone,
        text: `Hoshimono: order ${notice.orderNo} is confirmed for ${notice.slot}. ${pay} Track: ${notice.trackingUrl}`,
      })
  );
}
