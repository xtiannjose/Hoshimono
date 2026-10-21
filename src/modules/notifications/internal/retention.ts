import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendOnce } from "./send-once";

// Cart Reminders and Stock Alerts (ADR 0014).

export type CartReminderNotice = {
  cartId: string;
  email: string;
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
  const first = notice.name.split(" ")[0] || "there";
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
        subject: "Your cart is waiting",
        text: [
          `Hi ${first}, you left these in your cart:`,
          ...notice.items.slice(0, SHOWN).map((i) => `- ${i}`),
          ...(more > 0 ? [`and ${more} more`] : []),
          "",
          `Pick a delivery slot and check out: ${notice.cartUrl}`,
          "",
          `Do not want these emails? ${notice.stopUrl}`,
        ].join("\n"),
      })
  );
}

export type StockAlertNotice = {
  alertId: string;
  email: string | null;
  phone: string | null;
  product: string;
  productUrl: string;
};

/** A sold-out Product is back: the email and SMS the Customer asked for. */
export async function sendBackInStock(
  notice: StockAlertNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const ref = `stock-alert:${notice.alertId}`;
  const line = `${notice.product} is back in stock.`;
  if (notice.email) {
    const email = notice.email;
    await sendOnce(
      { template: "back_in_stock", channel: "email", ref, recipient: email },
      () =>
        (providers.email ?? emailProvider()).send({
          to: email,
          subject: `${notice.product} is back`,
          text: [
            `${line} You asked us to tell you.`,
            "",
            `Add it to your cart: ${notice.productUrl}`,
          ].join("\n"),
        })
    );
  }
  if (notice.phone) {
    const phone = notice.phone;
    await sendOnce(
      { template: "back_in_stock", channel: "sms", ref, recipient: phone },
      () =>
        (providers.sms ?? smsProvider()).send({
          to: phone,
          text: `Hoshimono: ${line} ${notice.productUrl}`,
        })
    );
  }
}
