import type { NotificationChannel } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import {
  emailProvider,
  smsProvider,
  type EmailProvider,
  type SmsProvider,
} from "./providers";

export type OrderConfirmedNotice = {
  orderId: string;
  orderNo: string;
  email: string | null;
  phone: string;
  /** Such as "Today, 2:00 to 4:00 PM". */
  slot: string;
  total: string;
  trackingUrl: string;
  lines: { name: string; quantity: number }[];
  cashOnDelivery: boolean;
};

const TEMPLATE = "order_confirmed";

async function alreadySent(orderId: string, channel: NotificationChannel) {
  const row = await db.notification.findUnique({
    where: {
      template_channel_orderId: { template: TEMPLATE, channel, orderId },
    },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Order confirmed email and SMS (PRD CHK-4). Each channel is logged once
 * sent, so a retried job only sends what is missing.
 */
export async function sendOrderConfirmed(
  notice: OrderConfirmedNotice,
  providers: { email?: EmailProvider; sms?: SmsProvider } = {}
): Promise<void> {
  const pay = notice.cashOnDelivery
    ? `Please have ${notice.total} ready in cash for the Rider.`
    : `Total ${notice.total}.`;

  if (notice.email && !(await alreadySent(notice.orderId, "email"))) {
    const sent = await (providers.email ?? emailProvider()).send({
      to: notice.email,
      subject: `Order ${notice.orderNo} is confirmed`,
      text: [
        `Salamat! We got your order ${notice.orderNo}.`,
        "",
        `Delivery: ${notice.slot}`,
        pay,
        "",
        ...notice.lines.map((l) => `${l.quantity} x ${l.name}`),
        "",
        `Track your order: ${notice.trackingUrl}`,
      ].join("\n"),
    });
    await db.notification.create({
      data: {
        template: TEMPLATE,
        channel: "email",
        recipient: notice.email,
        orderId: notice.orderId,
        provider: sent.provider,
        providerRef: sent.ref,
      },
    });
  }

  if (!(await alreadySent(notice.orderId, "sms"))) {
    const sent = await (providers.sms ?? smsProvider()).send({
      to: notice.phone,
      text: `Hoshimono: order ${notice.orderNo} is confirmed for ${notice.slot}. ${pay} Track: ${notice.trackingUrl}`,
    });
    await db.notification.create({
      data: {
        template: TEMPLATE,
        channel: "sms",
        recipient: notice.phone,
        orderId: notice.orderId,
        provider: sent.provider,
        providerRef: sent.ref,
      },
    });
  }
}
