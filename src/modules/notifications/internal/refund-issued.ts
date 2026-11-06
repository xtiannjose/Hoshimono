import type { Lang } from "@/i18n/lang";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";
import { WORDS } from "./words";

export type RefundNotice = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  /** Formatted, such as "₱134.50". */
  amount: string;
  method: "gcash" | "card";
  reason: "cancelled" | "picked" | "late_payment" | "staff";
  /** Staff record several refunds per Order (ADR 0023): each told once. */
  refundId?: string;
  trackingUrl: string;
};

/**
 * Refund email and SMS (ADR 0008), once per refund: an Order has at most
 * one refund per reason, so the reason names the template, except those
 * staff record, named by their id too.
 */
export async function sendRefundIssued(
  notice: RefundNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const t = WORDS[notice.lang].refund;
  const what = t[notice.reason](
    notice.amount,
    t.to[notice.method],
    notice.orderNo
  );
  const when = t.when[notice.method];
  const template = `refund_${notice.reason}`;
  const { orderId } = notice;
  const about =
    notice.reason === "staff"
      ? { orderId, ref: `refund:${notice.refundId}` }
      : { orderId };

  const email = notice.email;
  await sendAll([
    () =>
      email &&
      sendOnce({ template, channel: "email", ...about, recipient: email }, () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: t.subject(notice.orderNo),
          text: [what, when, "", t.order(notice.trackingUrl)].join("\n"),
        })
      ),
    () =>
      sendOnce(
        { template, channel: "sms", ...about, recipient: notice.phone },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: notice.phone,
            text: `Hoshimono: ${what} ${when}`,
          })
      ),
  ]);
}
