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

type Recipient = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
  /** The Customer's language (ADR 0021). */
  lang: Lang;
  /** Which trip this is about: each time the Order leaves, a new message. */
  trip: string;
};

async function sendBoth(
  r: Recipient,
  template: string,
  subject: string,
  text: string,
  providers: Providers
) {
  const email = r.email;
  await sendAll([
    () =>
      email &&
      sendOnce(
        { template, channel: "email", orderId: r.orderId, recipient: email },
        () =>
          (providers.email ?? emailProvider()).send({
            to: email,
            subject,
            text,
          })
      ),
    () =>
      sendOnce(
        { template, channel: "sms", orderId: r.orderId, recipient: r.phone },
        () =>
          (providers.sms ?? smsProvider()).send({
            to: r.phone,
            text: `Hoshimono: ${text}`,
          })
      ),
  ]);
}

export type OutForDeliveryNotice = Recipient & {
  riderName: string;
  riderPhone: string | null;
  pin: string;
  /** Cash to have ready, formatted; null when paid online. */
  cashDue: string | null;
  trackingUrl: string;
};

/** The Order left the Hub: who is coming, the Delivery PIN (ADR 0011). */
export async function sendOutForDelivery(
  n: OutForDeliveryNotice,
  providers: Providers = {}
): Promise<void> {
  const t = WORDS[n.lang].outForDelivery;
  const rider = n.riderPhone ? `${n.riderName} (${n.riderPhone})` : n.riderName;
  const text = [
    t.onItsWay(n.orderNo, rider),
    t.pin(n.pin),
    n.cashDue ? t.cash(n.cashDue) : "",
    t.track(n.trackingUrl),
  ]
    .filter(Boolean)
    .join(" ");
  await sendBoth(
    n,
    `out_for_delivery_${n.trip}`,
    t.subject(n.orderNo),
    text,
    providers
  );
}

/**
 * Staff cancelled the Order (a Hub problem, an item that cannot be had).
 * Their reason stays inside; any refund gets its own message.
 */
export async function sendOrderCancelled(
  n: Omit<Recipient, "trip">,
  providers: Providers = {}
): Promise<void> {
  const t = WORDS[n.lang].orderCancelled;
  await sendBoth(
    { ...n, trip: "" },
    "order_cancelled",
    t.subject(n.orderNo),
    t.text(n.orderNo),
    providers
  );
}

/** A delivery missed the Customer; the team calls to arrange another try. */
export async function sendDeliveryFailed(
  n: Recipient,
  providers: Providers = {}
): Promise<void> {
  const t = WORDS[n.lang].deliveryFailed;
  await sendBoth(
    n,
    `delivery_failed_${n.trip}`,
    t.subject(n.orderNo),
    t.text(n.orderNo),
    providers
  );
}
