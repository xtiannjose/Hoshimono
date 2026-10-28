import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendOnce } from "./send-once";

export type ClaimNotice = {
  claimId: string;
  email: string | null;
  phone: string;
  name: string;
  orderNo: string;
  product: string;
  approved: boolean;
  /** Back to GCash or the card it was paid with; amounts formatted. */
  refund: { amount: string; to: "GCash" | "your card" } | null;
  /** The rest as a Voucher: all of it for a cash Order. */
  voucher: { amount: string; code: string; until: string } | null;
  /** Why, when rejected or cut down. */
  note: string;
  orderUrl: string;
};

/** The decision on a Freshness Claim (ADR 0016): email, or SMS without one. */
export async function sendClaimDecided(
  notice: ClaimNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const first = notice.name.split(" ")[0] || "there";
  const what = notice.approved
    ? [
        `We approved your report on ${notice.product} (order ${notice.orderNo}).`,
        ...(notice.refund
          ? [`We are refunding ${notice.refund.amount} to ${notice.refund.to}.`]
          : []),
        ...(notice.voucher
          ? [
              `Here is ${notice.voucher.amount} off your next order: use code ${notice.voucher.code} until ${notice.voucher.until}, no minimum spend.`,
            ]
          : []),
        ...(notice.note ? [notice.note] : []),
      ]
    : [
        `We could not approve your report on ${notice.product} (order ${notice.orderNo}).`,
        notice.note,
      ];
  const ref = `claim:${notice.claimId}`;
  if (notice.email) {
    const email = notice.email;
    await sendOnce(
      { template: "claim_decided", channel: "email", ref, recipient: email },
      () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: `About your report on order ${notice.orderNo}`,
          text: [`Hi ${first},`, ...what, "", notice.orderUrl].join("\n"),
        })
    );
  } else {
    await sendOnce(
      {
        template: "claim_decided",
        channel: "sms",
        ref,
        recipient: notice.phone,
      },
      () =>
        (providers.sms ?? smsProvider()).send({
          to: notice.phone,
          text: `Hoshimono: ${what.join(" ")}`,
        })
    );
  }
}
