import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { PaymentProvider } from "./provider";

// Local only: paymentProvider() refuses the stand-in outside development and
// the local e2e build, so this secret guards nothing real.
const SECRET = "hoshimono-stand-in-payments";
const SIGNATURE = "x-stand-in-signature";
const PAID = "payment.paid";

const sign = (body: string) =>
  createHmac("sha256", SECRET).update(body).digest("hex");

/**
 * The stand-in provider for development and the e2e suite. Its hosted
 * checkout is the local /dev/pay page, whose Pay button sends a signed
 * "paid" webhook to /api/webhooks/fake the way PayMongo would.
 */
export function createFakeProvider(appUrl: string): PaymentProvider {
  return {
    name: "fake",

    async createCheckout(request) {
      const providerRef = `fake_cs_${randomUUID()}`;
      const url = new URL(`/dev/pay/${providerRef}`, appUrl);
      url.search = new URLSearchParams({
        amount: String(request.amountCents),
        reference: request.reference,
        success: request.successUrl,
        cancel: request.cancelUrl,
      }).toString();
      return { providerRef, redirectUrl: url.toString() };
    },

    // ponytail: always closes; a real provider refuses while a payment is in flight.
    async expireCheckout() {
      return "expired";
    },

    async capture() {},

    async refund() {
      return { ok: true, refundRef: `fake_ref_${randomUUID()}` };
    },

    verifyWebhook(rawBody, headers) {
      const sent = Buffer.from(headers.get(SIGNATURE) ?? "");
      const expected = Buffer.from(sign(rawBody));
      return sent.length === expected.length && timingSafeEqual(sent, expected);
    },

    parseEvent(rawBody) {
      const event = JSON.parse(rawBody) as {
        id: string;
        type: string;
        providerRef: string;
        paymentRef: string;
        amountCents: number;
      };
      return {
        id: event.id,
        type: event.type,
        kind: event.type === PAID ? "paid" : "other",
        providerRef: event.providerRef,
        paymentRef: event.paymentRef,
        amountCents: event.amountCents,
      };
    },
  };
}

/** The signed webhook the stand-in checkout sends when the Customer pays. */
export function fakePaidWebhook(
  providerRef: string,
  amountCents: number
): { body: string; headers: Record<string, string> } {
  const body = JSON.stringify({
    id: `fake_evt_${randomUUID()}`,
    type: PAID,
    providerRef,
    paymentRef: `fake_pay_${randomUUID()}`,
    amountCents,
  });
  return {
    body,
    headers: { "content-type": "application/json", [SIGNATURE]: sign(body) },
  };
}
