import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";

type Providers = { email?: EmailProvider; sms?: SmsProvider };

/**
 * A text staff wrote to the Customer about their Order, sent once under
 * `ref` (one per message). Texted, because it is usually urgent.
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

export type VoucherGivenNotice = {
  /** One per Voucher, such as "voucher:<id>". */
  ref: string;
  email: string | null;
  phone: string | null;
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
  const line = `Sorry about order ${n.orderNo}. Here's ${n.amount} off your next order with code ${n.code}, until ${n.until}.`;
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
            subject: `${n.amount} off your next order`,
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
