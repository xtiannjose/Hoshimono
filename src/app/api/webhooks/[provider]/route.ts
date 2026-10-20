import { after } from "next/server";

import { runDueJobs } from "@/modules/jobs";
import { confirmPaidOrder } from "@/modules/orders";
import { handleWebhook, paymentProvider } from "@/modules/payments";

import { jobHandlers } from "@/server/job-handlers";

/**
 * Payment provider webhooks (docs/03 section 8). The raw body is read as
 * text, untouched, because the signature covers its exact bytes. A paid
 * Order is confirmed in the same transaction as its Payment.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/webhooks/[provider]">
) {
  const provider = paymentProvider((await params).provider);
  if (!provider) return new Response("Not found", { status: 404 });
  const result = await handleWebhook(
    provider,
    await request.text(),
    request.headers,
    { onPaid: confirmPaidOrder }
  );
  // Send the confirmation now; the cron run is the safety net.
  if (result === "applied") {
    after(() => runDueJobs(jobHandlers).then(() => undefined));
  }
  // Anything but a bad signature is acknowledged, so the provider stops
  // retrying; duplicates and unmatched events are already recorded.
  return result === "rejected"
    ? new Response("Invalid signature", { status: 401 })
    : Response.json({ result });
}
