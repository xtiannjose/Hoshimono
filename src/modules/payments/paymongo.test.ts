// The PayMongo adapter's requests, against a fake HTTP layer. Whether
// PayMongo accepts them is checked with test-mode keys (Batch 3.2).
import { describe, expect, it } from "vitest";

import { createPaymongo } from ".";

type Sent = { url: string; init: RequestInit };

/** A fetch that records each request and answers with `reply`. */
function fakeFetch(reply: unknown, status = 200) {
  const sent: Sent[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(reply), { status });
  };
  return { fetch: fetch as typeof globalThis.fetch, sent };
}

const config = { secretKey: "sk_test_hoshimono", webhookSecret: "whsk_test" };
// base64("sk_test_hoshimono:"): the secret key is the basic-auth user.
const AUTH = "Basic c2tfdGVzdF9ob3NoaW1vbm86";
const body = (s: Sent) => JSON.parse(String(s.init.body));

describe("PayMongo adapter", () => {
  it("opens a hosted Checkout Session for the Order total", async () => {
    const { fetch, sent } = fakeFetch({
      data: {
        id: "cs_abc123",
        attributes: { checkout_url: "https://checkout.paymongo.com/cs_abc123" },
      },
    });
    const paymongo = createPaymongo({ ...config, fetch });

    const checkout = await paymongo.createCheckout({
      reference: "SW-201026-0042",
      description: "Hoshimono order SW-201026-0042",
      amountCents: 69400,
      methods: ["gcash", "card"],
      successUrl: "https://hoshimono.ph/checkout/return?o=SW-201026-0042",
      cancelUrl: "https://hoshimono.ph/checkout",
    });

    expect(checkout).toEqual({
      providerRef: "cs_abc123",
      redirectUrl: "https://checkout.paymongo.com/cs_abc123",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.paymongo.com/v2/checkout_sessions");
    expect(sent[0].init.method).toBe("POST");
    expect(new Headers(sent[0].init.headers).get("authorization")).toBe(AUTH);
    expect(body(sent[0])).toEqual({
      data: {
        attributes: {
          line_items: [
            {
              name: "Hoshimono order SW-201026-0042",
              amount: 69400,
              currency: "PHP",
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card"],
          success_url: "https://hoshimono.ph/checkout/return?o=SW-201026-0042",
          cancel_url: "https://hoshimono.ph/checkout",
          reference_number: "SW-201026-0042",
          send_email_receipt: false,
        },
      },
    });
  });

  it("refunds part of a payment and returns the refund id", async () => {
    const { fetch, sent } = fakeFetch({ data: { id: "ref_789" } });
    const paymongo = createPaymongo({ ...config, fetch });

    expect(await paymongo.refund("pay_456", 5000, "others")).toEqual({
      refundRef: "ref_789",
    });

    expect(sent[0].url).toBe("https://api.paymongo.com/v1/refunds");
    expect(new Headers(sent[0].init.headers).get("authorization")).toBe(AUTH);
    expect(body(sent[0])).toEqual({
      data: {
        attributes: { amount: 5000, payment_id: "pay_456", reason: "others" },
      },
    });
  });

  it("captures the final amount of a card hold", async () => {
    const { fetch, sent } = fakeFetch({ data: { id: "pi_123" } });
    const paymongo = createPaymongo({ ...config, fetch });

    await paymongo.capture("pi_123", 61000);

    expect(sent[0].url).toBe(
      "https://api.paymongo.com/v1/payment_intents/pi_123/capture"
    );
    expect(body(sent[0])).toEqual({ data: { attributes: { amount: 61000 } } });
  });

  it("fails with PayMongo's own reason when it refuses a request", async () => {
    const { fetch } = fakeFetch(
      {
        errors: [
          {
            code: "parameter_below_minimum",
            detail: "amount cannot be less than 2000.",
          },
        ],
      },
      400
    );
    const paymongo = createPaymongo({ ...config, fetch });

    await expect(paymongo.refund("pay_456", 100, "others")).rejects.toThrow(
      "PayMongo 400 on /v1/refunds: amount cannot be less than 2000."
    );
  });
});
