import type { Lang } from "@/i18n/lang";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";
import { WORDS } from "./words";

// Cart Reminders and Stock Alerts (ADR 0014).

export type CartReminderNotice = {
  cartId: string;
  email: string;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  name: string;
  /** Product names in the Cart. */
  items: string[];
  cartUrl: string;
  /** Stops reminders and offers without signing in. */
  stopUrl: string;
};

const SHOWN = 5;

/** The one Cart Reminder email (marketing: only with consent). */
export async function sendCartReminder(
  notice: CartReminderNotice,
  providers: { email?: EmailProvider } = {}
): Promise<void> {
  const t = WORDS[notice.lang].cartReminder;
  const more = notice.items.length - SHOWN;
  await sendOnce(
    {
      template: "cart_reminder",
      channel: "email",
      ref: `cart:${notice.cartId}`,
      recipient: notice.email,
    },
    () =>
      (providers.email ?? emailProvider()).send({
        to: notice.email,
        subject: t.subject,
        text: [
          t.left(notice.name.split(" ")[0]),
          ...notice.items.slice(0, SHOWN).map((i) => `- ${i}`),
          ...(more > 0 ? [t.more(more)] : []),
          "",
          t.checkout(notice.cartUrl),
          "",
          t.stop(notice.stopUrl),
        ].join("\n"),
      })
  );
}

export type StockAlertNotice = {
  alertId: string;
  email: string | null;
  phone: string | null;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  product: string;
  productUrl: string;
};

/** A sold-out Product is back: the email and SMS the Customer asked for. */
export async function sendBackInStock(
  notice: StockAlertNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const t = WORDS[notice.lang].backInStock;
  const ref = `stock-alert:${notice.alertId}`;
  const line = t.line(notice.product);
  const { email, phone } = notice;
  await sendAll([
    () =>
      email &&
      sendOnce(
        { template: "back_in_stock", channel: "email", ref, recipient: email },
        () =>
          (providers.email ?? emailProvider()).send({
            to: email,
            subject: t.subject(notice.product),
            text: [`${line} ${t.asked}`, "", t.add(notice.productUrl)].join(
              "\n"
            ),
          })
      ),
    () =>
      phone &&
      sendOnce(
        { template: "back_in_stock", channel: "sms", ref, recipient: phone },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: phone,
            text: `Hoshimono: ${line} ${notice.productUrl}`,
          })
      ),
  ]);
}

export type ReferralRewardNotice = {
  rewardId: string;
  /** Who this message is for: the one who invited, or the friend. */
  role: "referrer" | "referee";
  email: string | null;
  phone: string | null;
  /** This person's language (ADR 0021). */
  lang: Lang;
  name: string;
  /** The friend's first name, for the referrer's message; empty if none. */
  friend: string;
  code: string;
  /** Formatted, such as "₱100.00". */
  amount: string;
  minSpend: string;
  until: string;
  shopUrl: string;
};

/** "You earned a ₱100 Voucher" after a Referral (ADR 0015): email, or SMS without one. */
export async function sendReferralReward(
  notice: ReferralRewardNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const words = WORDS[notice.lang];
  const t = words.referral;
  const why =
    notice.role === "referrer" ? t.referrer(notice.friend) : t.referee;
  const what = t.voucher(
    notice.amount,
    notice.code,
    notice.minSpend,
    notice.until
  );
  const ref = `referral:${notice.rewardId}:${notice.role}`;
  if (notice.email) {
    const email = notice.email;
    await sendOnce(
      { template: "referral_reward", channel: "email", ref, recipient: email },
      () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: t.subject(notice.amount),
          text: [
            words.greet(notice.name.split(" ")[0]),
            why,
            what,
            "",
            notice.shopUrl,
          ].join("\n"),
        })
    );
  } else if (notice.phone) {
    const phone = notice.phone;
    await sendOnce(
      { template: "referral_reward", channel: "sms", ref, recipient: phone },
      () =>
        (providers.sms ?? smsProvider()).send({
          to: phone,
          text: `Hoshimono: ${why} ${what}`,
        })
    );
  }
}
