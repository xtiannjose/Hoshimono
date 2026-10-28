import type { NotificationChannel } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import type { Sent } from "./providers";

/**
 * Sends every message even when one fails, then throws the first failure so
 * the job runs again; the ones already sent are skipped then. An email
 * outage must not stop the text with the Delivery PIN.
 */
export async function sendAll(sends: (() => unknown)[]): Promise<void> {
  const errors: unknown[] = [];
  for (const send of sends) {
    try {
      await send();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw errors[0];
}

/**
 * Send one message on one channel at most once: about an Order, or about
 * something else named by `ref` ("cart:<id>", ADR 0014). The log row is
 * written after it goes out, so a retried job sends only what is missing.
 */
export async function sendOnce(
  {
    template,
    channel,
    recipient,
    ...about
  }: {
    template: string;
    channel: NotificationChannel;
    recipient: string;
  } & ({ orderId: string } | { ref: string }),
  send: () => Promise<Sent>
): Promise<void> {
  const logged = await db.notification.findFirst({
    where: { template, channel, ...about },
    select: { id: true },
  });
  if (logged) return;
  const sent = await send();
  await db.notification.create({
    data: {
      template,
      channel,
      recipient,
      ...about,
      provider: sent.provider,
      providerRef: sent.ref,
    },
  });
}
