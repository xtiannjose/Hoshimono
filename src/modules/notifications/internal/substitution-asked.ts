import type { Lang } from "@/i18n/lang";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";
import { WORDS } from "./words";

export type SubstitutionNotice = {
  orderId: string;
  orderNo: string;
  substitutionId: string;
  email: string | null;
  phone: string;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
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
  const t = WORDS[notice.lang].substitution;
  const offer = t.offer(
    notice.ordered,
    notice.orderNo,
    notice.quantity,
    notice.substitute,
    notice.unitPrice
  );
  const ask = t.ask(notice.until, notice.link);
  const template = `substitution_${notice.substitutionId}`;
  const { orderId } = notice;

  const email = notice.email;
  await sendAll([
    () =>
      email &&
      sendOnce({ template, channel: "email", orderId, recipient: email }, () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: t.subject(notice.orderNo),
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
