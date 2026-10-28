import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";
import { sendAll, sendOnce } from "./send-once";

type Providers = { email?: EmailProvider; sms?: SmsProvider };

type Recipient = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
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
  const rider = n.riderPhone ? `${n.riderName} (${n.riderPhone})` : n.riderName;
  const text = [
    `Order ${n.orderNo} is on its way with ${rider}.`,
    `Give the Rider this PIN at the door: ${n.pin}.`,
    n.cashDue ? `Please have ${n.cashDue} ready in cash.` : "",
    `Track: ${n.trackingUrl}`,
  ]
    .filter(Boolean)
    .join(" ");
  await sendBoth(
    n,
    `out_for_delivery_${n.trip}`,
    `Order ${n.orderNo} is on its way`,
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
  await sendBoth(
    { ...n, trip: "" },
    "order_cancelled",
    `Order ${n.orderNo} is cancelled`,
    `We're sorry, we had to cancel order ${n.orderNo}. If you paid online, all of it comes back to you, and we'll tell you when it's sent.`,
    providers
  );
}

/** A delivery missed the Customer; the team calls to arrange another try. */
export async function sendDeliveryFailed(
  n: Recipient,
  providers: Providers = {}
): Promise<void> {
  await sendBoth(
    n,
    `delivery_failed_${n.trip}`,
    `We missed you: order ${n.orderNo}`,
    `Sorry, we could not deliver order ${n.orderNo}. We will call you to arrange another try.`,
    providers
  );
}
