import type { NotificationChannel } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import type { Sent } from "./providers";

/**
 * Send one message for an Order on one channel, at most once: the log row
 * is written after it goes out, so a retried job sends only what is missing.
 */
export async function sendOnce(
  {
    template,
    channel,
    orderId,
    recipient,
  }: {
    template: string;
    channel: NotificationChannel;
    orderId: string;
    recipient: string;
  },
  send: () => Promise<Sent>
): Promise<void> {
  const logged = await db.notification.findUnique({
    where: { template_channel_orderId: { template, channel, orderId } },
    select: { id: true },
  });
  if (logged) return;
  const sent = await send();
  await db.notification.create({
    data: {
      template,
      channel,
      recipient,
      orderId,
      provider: sent.provider,
      providerRef: sent.ref,
    },
  });
}
