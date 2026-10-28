import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";

export type RefundNotice = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
  /** Formatted, such as "₱134.50". */
  amount: string;
  method: "gcash" | "card";
  reason: "cancelled" | "picked" | "late_payment";
  trackingUrl: string;
};

/**
 * Refund email and SMS (ADR 0008), once per refund: an Order has at most
 * one refund per reason, so the reason names the template.
 */
export async function sendRefundIssued(
  notice: RefundNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const to = notice.method === "gcash" ? "your GCash" : "your card";
  const what = {
    cancelled: `We refunded ${notice.amount} to ${to} for your cancelled order ${notice.orderNo}.`,
    picked: `Your order ${notice.orderNo} came to less than you paid, so we refunded the ${notice.amount} difference to ${to}.`,
    late_payment: `Your payment for order ${notice.orderNo} arrived after the order was cancelled, so we refunded all ${notice.amount} to ${to}.`,
  }[notice.reason];
  const when =
    notice.method === "gcash"
      ? "It usually shows within a day."
      : "It can take a few banking days to show on your card.";
  const template = `refund_${notice.reason}`;
  const { orderId } = notice;

  const email = notice.email;
  await sendAll([
    () =>
      email &&
      sendOnce({ template, channel: "email", orderId, recipient: email }, () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: `Refund for order ${notice.orderNo}`,
          text: [what, when, "", `Your order: ${notice.trackingUrl}`].join(
            "\n"
          ),
        })
      ),
    () =>
      sendOnce(
        { template, channel: "sms", orderId, recipient: notice.phone },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: notice.phone,
            text: `Hoshimono: ${what} ${when}`,
          })
      ),
  ]);
}
