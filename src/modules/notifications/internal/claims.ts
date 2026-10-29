import type { Lang } from "@/i18n/lang";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendOnce } from "./send-once";
import { WORDS } from "./words";

export type ClaimNotice = {
  claimId: string;
  email: string | null;
  phone: string;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  name: string;
  orderNo: string;
  product: string;
  approved: boolean;
  /** Back to GCash or the card it was paid with; the amount formatted. */
  refund: { amount: string; method: "gcash" | "card" } | null;
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
  const words = WORDS[notice.lang];
  const t = words.claim;
  const what = notice.approved
    ? [
        t.approved(notice.product, notice.orderNo),
        ...(notice.refund
          ? [t.refunding(notice.refund.amount, t.to[notice.refund.method])]
          : []),
        ...(notice.voucher
          ? [
              t.voucher(
                notice.voucher.amount,
                notice.voucher.code,
                notice.voucher.until
              ),
            ]
          : []),
        ...(notice.note ? [notice.note] : []),
      ]
    : [t.rejected(notice.product, notice.orderNo), notice.note];
  const ref = `claim:${notice.claimId}`;
  if (notice.email) {
    const email = notice.email;
    await sendOnce(
      { template: "claim_decided", channel: "email", ref, recipient: email },
      () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: t.subject(notice.orderNo),
          text: [
            words.greet(notice.name.split(" ")[0]),
            ...what,
            "",
            notice.orderUrl,
          ].join("\n"),
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
