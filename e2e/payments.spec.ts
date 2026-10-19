import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

// The webhook route end to end: raw body in, signature checked, event kept.
const SECRET = "whsk_e2e"; // PAYMONGO_WEBHOOK_SECRET in playwright.config.ts

function sign(body: string): string {
  const t = String(Math.floor(Date.now() / 1000));
  const mac = createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");
  return `t=${t},te=${mac},li=`;
}

const event = JSON.stringify({
  data: {
    id: `evt_e2e_${Date.now()}`,
    type: "event",
    attributes: {
      type: "checkout_session.payment.paid",
      livemode: false,
      data: { id: "cs_e2e_not_ours", type: "checkout_session", attributes: {} },
    },
  },
});

test("the PayMongo webhook takes only signed requests", async ({ request }) => {
  const unsigned = await request.post("/api/webhooks/paymongo", {
    data: event,
    headers: { "content-type": "application/json" },
  });
  expect(unsigned.status()).toBe(401);

  const signed = await request.post("/api/webhooks/paymongo", {
    data: event,
    headers: {
      "content-type": "application/json",
      "paymongo-signature": sign(event),
    },
  });
  expect(signed.status()).toBe(200);
  expect(await signed.json()).toEqual({ result: "unmatched" });

  const unknown = await request.post("/api/webhooks/xendit", { data: event });
  expect(unknown.status()).toBe(404);
});
