import type { Lang } from "@/i18n/lang";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";
import { WORDS } from "./words";

export type OrderConfirmedNotice = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  /** Such as "Today, 2:00 to 4:00 PM", in that language. */
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
  const t = WORDS[notice.lang].orderConfirmed;
  // Weighed Products are charged by the packed weight (CLAUDE.md), so the
  // amount here is an estimate and must say so.
  const pay = notice.estimated
    ? notice.cashOnDelivery
      ? t.aboutCash(notice.total)
      : t.aboutPaid(notice.total)
    : notice.cashOnDelivery
      ? t.cash(notice.total)
      : t.paid(notice.total);
  const { orderId } = notice;

  const to = notice.email;
  await sendAll([
    () =>
      to &&
      sendOnce(
        { template: TEMPLATE, channel: "email", orderId, recipient: to },
        () =>
          (providers.email ?? emailProvider()).send({
            to,
            subject: t.subject(notice.orderNo),
            text: [
              t.thanks(notice.orderNo),
              "",
              t.delivery(notice.slot),
              pay,
              "",
              ...notice.lines.map((l) => `${l.quantity} x ${l.name}`),
              "",
              t.track(notice.trackingUrl),
            ].join("\n"),
          })
      ),
    () =>
      sendOnce(
        {
          template: TEMPLATE,
          channel: "sms",
          orderId,
          recipient: notice.phone,
        },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: notice.phone,
            text: `Hoshimono: ${t.sms(notice.orderNo, notice.slot, pay, notice.trackingUrl)}`,
          })
      ),
  ]);
}
