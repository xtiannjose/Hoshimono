import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";

export type SubstitutionNotice = {
  orderId: string;
  orderNo: string;
  substitutionId: string;
  email: string | null;
  phone: string;
  /** What was ordered and is missing. */
  ordered: string;
  substitute: string;
  quantity: number;
  /** What the Customer pays per piece, formatted: the lower price (ADR 0010). */
  unitPrice: string;
  /** When the Substitution Window ends, Manila time, such as "3:42 PM". */
  until: string;
  /** Where the Customer can say no. */
  link: string;
};

/**
 * Ask the Customer about a "pick a similar item" swap (ADR 0010), once per
 * Substitution. Silence until the window ends counts as a yes.
 */
export async function sendSubstitutionAsked(
  notice: SubstitutionNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const offer = `We're out of ${notice.ordered} for order ${notice.orderNo}. We can send ${notice.quantity} x ${notice.substitute} at ${notice.unitPrice} each instead.`;
  const ask = `Not okay? Tell us by ${notice.until}: ${notice.link}. No reply means yes.`;
  const template = `substitution_${notice.substitutionId}`;
  const { orderId } = notice;

  const email = notice.email;
  await sendAll([
    () =>
      email &&
      sendOnce({ template, channel: "email", orderId, recipient: email }, () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: `A substitute for order ${notice.orderNo}`,
          text: [offer, "", ask].join("\n"),
        })
      ),
    () =>
      sendOnce(
        { template, channel: "sms", orderId, recipient: notice.phone },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: notice.phone,
            text: `Hoshimono: ${offer} ${ask}`,
          })
      ),
  ]);
}
