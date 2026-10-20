// PayMongo adapter (ADR 0003). Webhooks: docs.paymongo.com "Securing a
// webhook"; events: the event resource, whose attributes.data is the
// resource the event is about.
import { createHmac, timingSafeEqual } from "node:crypto";

import type { PaymentProvider, ProviderEvent } from "./provider";

const API = "https://api.paymongo.com";

/** A request PayMongo refused, with its HTTP status. */
class PaymongoError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

type Config = {
  /** sk_test_... or sk_live_...; the prefix also picks the webhook mode. */
  secretKey: string;
  /** The secret_key PayMongo returned when the webhook endpoint was made. */
  webhookSecret: string;
  /** Replaced in tests; the real one everywhere else. */
  fetch?: typeof globalThis.fetch;
};

type PaymongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        attributes?: {
          payments?: { id?: string; attributes?: { amount?: number } }[];
        };
      };
    };
  };
};

export function createPaymongo({
  secretKey,
  webhookSecret,
  fetch = globalThis.fetch,
}: Config): PaymentProvider {
  // The secret key is the basic-auth user, with no password.
  const authorization = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

  /** POST one resource; PayMongo wraps attributes in { data: { attributes } }. */
  async function post<T>(path: string, attributes: object): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { authorization, "content-type": "application/json" },
      body: JSON.stringify({ data: { attributes } }),
    });
    const json = (await res.json()) as T & {
      errors?: { code?: string; detail?: string }[];
    };
    if (!res.ok) {
      const reason = json.errors?.map((e) => e.detail ?? e.code).join("; ");
      throw new PaymongoError(
        res.status,
        `PayMongo ${res.status} on ${path}: ${reason ?? "no detail"}`
      );
    }
    return json;
  }

  // A test-mode key only trusts test signatures, so a test event can never
  // be replayed against live, or the other way round.
  const mode = secretKey.startsWith("sk_live_") ? "li" : "te";

  return {
    name: "paymongo",

    async createCheckout(request) {
      // One line for the Order total: the hosted page shows what we charge,
      // never a re-added sum of our lines.
      const session = await post<{
        data: { id: string; attributes: { checkout_url: string } };
      }>("/v2/checkout_sessions", {
        line_items: [
          {
            name: request.description,
            amount: request.amountCents,
            currency: "PHP",
            quantity: 1,
          },
        ],
        payment_method_types: request.methods,
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        reference_number: request.reference,
        // Our own confirmation email and SMS go out instead.
        send_email_receipt: false,
      });
      return {
        providerRef: session.data.id,
        redirectUrl: session.data.attributes.checkout_url,
      };
    },

    async expireCheckout(providerRef) {
      // PayMongo answers 400 when the session is paid, has a payment still
      // processing, or is already expired (docs: Expire a Checkout Session).
      // ponytail: path from the docs, unconfirmed until test keys exist (3.2).
      try {
        await post(`/v1/checkout_sessions/${providerRef}/expire`, {});
        return "expired";
      } catch (error) {
        if (error instanceof PaymongoError && error.status === 400) {
          return "refused";
        }
        throw error;
      }
    },

    async capture(holdRef, amountCents) {
      await post(`/v1/payment_intents/${holdRef}/capture`, {
        amount: amountCents,
      });
    },

    async refund(paymentRef, amountCents, note) {
      try {
        const refund = await post<{ data: { id: string } }>("/v1/refunds", {
          amount: amountCents,
          payment_id: paymentRef,
          // PayMongo takes only duplicate, fraudulent or others.
          reason: "others",
          notes: note,
        });
        return { ok: true, refundRef: refund.data.id };
      } catch (error) {
        // A 4xx is PayMongo saying no; anything else leaves us not knowing.
        if (
          error instanceof PaymongoError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return { ok: false, reason: error.message };
        }
        throw error;
      }
    },

    verifyWebhook(rawBody, headers) {
      const parts = new Map(
        (headers.get("paymongo-signature") ?? "")
          .split(",")
          .map((part) => part.split("=", 2) as [string, string])
      );
      const timestamp = parts.get("t");
      const sent = parts.get(mode);
      if (!timestamp || !sent) return false;
      const expected = createHmac("sha256", webhookSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
      return (
        sent.length === expected.length &&
        timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
      );
    },

    parseEvent(rawBody): ProviderEvent {
      const event = (JSON.parse(rawBody) as PaymongoEvent).data;
      const type = event?.attributes?.type ?? "unknown";
      const resource = event?.attributes?.data;
      const paid = type === "checkout_session.payment.paid";
      const payment = paid ? resource?.attributes?.payments?.[0] : undefined;
      return {
        id: event?.id ?? "",
        type,
        kind: paid ? "paid" : "other",
        providerRef: resource?.id ?? null,
        paymentRef: payment?.id ?? null,
        amountCents: payment?.attributes?.amount ?? null,
      };
    },
  };
}
