import { handleWebhook, paymentProvider } from "@/modules/payments";

/**
 * Payment provider webhooks (docs/03 section 8). The raw body is read as
 * text, untouched, because the signature covers its exact bytes.
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
    request.headers
  );
  // Anything but a bad signature is acknowledged, so the provider stops
  // retrying; duplicates and unmatched events are already recorded.
  return result === "rejected"
    ? new Response("Invalid signature", { status: 401 })
    : Response.json({ result });
}
