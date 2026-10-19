import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import type { PaymentProvider } from "./provider";

/** What happened to one delivery; every value but "rejected" is acknowledged. */
export type WebhookResult =
  "rejected" | "duplicate" | "unmatched" | "recorded" | "mismatch" | "applied";

/**
 * Verify, record, then apply one provider webhook (docs/03 section 8).
 * The signature is checked before anything else is read.
 */
export async function handleWebhook(
  provider: PaymentProvider,
  rawBody: string,
  headers: Headers
): Promise<WebhookResult> {
  if (!provider.verifyWebhook(rawBody, headers)) return "rejected";
  const event = provider.parseEvent(rawBody);

  return db.$transaction(async (tx) => {
    // The unique (provider, provider_event_id) decides: a repeat, even one
    // arriving at the same moment, inserts nothing and changes nothing.
    const { count } = await tx.paymentEvent.createMany({
      data: {
        provider: provider.name,
        providerEventId: event.id,
        type: event.type,
        payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
      },
      skipDuplicates: true,
    });
    if (count === 0) return "duplicate";
    const recorded = {
      provider_providerEventId: {
        provider: provider.name,
        providerEventId: event.id,
      },
    };
    const payment = await tx.payment.findFirst({
      where: { provider: provider.name, providerRef: event.providerRef },
    });
    // Kept unprocessed, for someone to look at: nothing here matches it.
    if (!payment) return "unmatched";
    await tx.paymentEvent.update({
      where: recorded,
      data: { paymentId: payment.id },
    });
    if (event.kind !== "paid") return "recorded";
    // Never mark paid on an amount the Order did not ask for.
    if (event.amountCents !== payment.amountCents) {
      console.error(
        `[payments] ${provider.name} event ${event.id} paid ${event.amountCents}, Payment ${payment.id} expects ${payment.amountCents}`
      );
      return "mismatch";
    }
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "paid", capturedCents: event.amountCents },
    });
    await tx.paymentEvent.update({
      where: recorded,
      data: { processedAt: new Date() },
    });
    return "applied";
  });
}
