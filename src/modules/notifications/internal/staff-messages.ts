import type { Lang } from "@/i18n/lang";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";
import { WORDS } from "./words";

type Providers = { email?: EmailProvider; sms?: SmsProvider };

/**
 * A text staff wrote to the Customer about their Order, sent once under
 * `ref` (one per message). Texted, because it is usually urgent. It goes
 * out as staff typed it; "Hoshimono:" reads the same in both languages.
 */
export async function sendStaffMessage(
  n: { ref: string; phone: string; text: string },
  providers: Providers = {}
): Promise<void> {
  await sendOnce(
    {
      template: "staff_message",
      channel: "sms",
      ref: n.ref,
      recipient: n.phone,
    },
    () =>
      (providers.sms ?? smsProvider()).send({
        to: n.phone,
        text: `Hoshimono: ${n.text}`,
      })
  );
}

/** Staff moved the Order to another Slot: the new time, in the Customer's language. */
export async function sendSlotMoved(
  n: { ref: string; phone: string; lang: Lang; orderNo: string; slot: string },
  providers: Providers = {}
): Promise<void> {
  await sendStaffMessage(
    {
      ref: n.ref,
      phone: n.phone,
      text: WORDS[n.lang].slotMoved(n.orderNo, n.slot),
    },
    providers
  );
}

export type VoucherGivenNotice = {
  /** One per Voucher, such as "voucher:<id>". */
  ref: string;
  email: string | null;
  phone: string | null;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  orderNo: string;
  amount: string;
  code: string;
  until: string;
};

/** Staff gave the Customer a Voucher to make up for an Order. */
export async function sendVoucherGiven(
  n: VoucherGivenNotice,
  providers: Providers = {}
): Promise<void> {
  const t = WORDS[n.lang].voucherGiven;
  const line = t.text(n.orderNo, n.amount, n.code, n.until);
  const { email, phone } = n;
  await sendAll([
    () =>
      email &&
      sendOnce(
        {
          template: "voucher_given",
          channel: "email",
          ref: n.ref,
          recipient: email,
        },
        () =>
          (providers.email ?? emailProvider()).send({
            to: email,
            subject: t.subject(n.amount),
            text: line,
          })
      ),
    () =>
      phone &&
      sendOnce(
        {
          template: "voucher_given",
          channel: "sms",
          ref: n.ref,
          recipient: phone,
        },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: phone,
            text: `Hoshimono: ${line}`,
          })
      ),
  ]);
}
