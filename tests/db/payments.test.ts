import { createHmac, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPaymongo, handleWebhook } from "@/modules/payments";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
const WEBHOOK_SECRET = "whsk_test_hoshimono";
const paymongo = createPaymongo({
  secretKey: "sk_test_hoshimono",
  webhookSecret: WEBHOOK_SECRET,
});

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
}, 60_000);
afterAll(() => db.$disconnect());

/** A Paymongo-Signature header as PayMongo documents it: HMAC-SHA256 of "t.body". */
function signed(
  body: string,
  {
    secret = WEBHOOK_SECRET,
    mode = "te",
  }: { secret?: string; mode?: "te" | "li" } = {}
): Headers {
  const t = "1792400000";
  const mac = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return new Headers({
    "paymongo-signature": `t=${t},te=${mode === "te" ? mac : ""},li=${mode === "li" ? mac : ""}`,
  });
}

/** checkout_session.payment.paid, shaped like PayMongo's event resource. */
function paidEvent({
  sessionId,
  amount,
  eventId = `evt_${randomUUID().replaceAll("-", "")}`,
}: {
  sessionId: string;
  amount: number;
  eventId?: string;
}): string {
  return JSON.stringify({
    data: {
      id: eventId,
      type: "event",
      attributes: {
        type: "checkout_session.payment.paid",
        livemode: false,
        data: {
          id: sessionId,
          type: "checkout_session",
          attributes: {
            reference_number: "SW-TEST",
            payments: [
              {
                id: `pay_${randomUUID().replaceAll("-", "")}`,
                type: "payment",
                attributes: { amount, status: "paid" },
              },
            ],
          },
        },
      },
    },
  });
}

/** An Order waiting for an online payment, with its PayMongo Checkout Session. */
async function onlinePayment(amountCents = 69400) {
  const customer = await db.customer.findUniqueOrThrow({
    where: { email: "ligaya@example.com" },
  });
  const slot = await db.slot.findFirstOrThrow({
    where: { hubId: seedId("hub:pasig") },
  });
  const order = await db.order.create({
    data: {
      orderNo: `SW-${randomUUID().slice(0, 8)}`,
      customerId: customer.id,
      hubId: slot.hubId,
      slotId: slot.id,
      status: "pending_payment",
      paymentStatus: "unpaid",
      addressSnapshot: {},
      contactPhone: "+639171234567",
      subtotalCents: amountCents - 4900,
      deliveryFeeCents: 4900,
      vatCents: 0,
      totalCents: amountCents,
      idempotencyKey: randomUUID(),
    },
  });
  const sessionId = `cs_${randomUUID().replaceAll("-", "")}`;
  const payment = await db.payment.create({
    data: {
      orderId: order.id,
      provider: "paymongo",
      providerRef: sessionId,
      method: "gcash",
      amountCents,
      status: "unpaid",
    },
  });
  return { paymentId: payment.id, sessionId };
}

describe("handleWebhook", () => {
  it("marks the Payment paid and records the event", async () => {
    const { paymentId, sessionId } = await onlinePayment(69400);
    const body = paidEvent({ sessionId, amount: 69400 });

    expect(await handleWebhook(paymongo, body, signed(body))).toBe("applied");

    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ status: "paid", capturedCents: 69400 });
    const events = await db.paymentEvent.findMany({ where: { paymentId } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      provider: "paymongo",
      type: "checkout_session.payment.paid",
    });
    expect(events[0].processedAt).not.toBeNull();
  });

  it("applies an event once however many times it arrives", async () => {
    const { paymentId, sessionId } = await onlinePayment(52000);
    const body = paidEvent({ sessionId, amount: 52000 });

    expect(await handleWebhook(paymongo, body, signed(body))).toBe("applied");
    const afterFirst = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    for (let i = 0; i < 9; i++) {
      expect(await handleWebhook(paymongo, body, signed(body))).toBe(
        "duplicate"
      );
    }

    expect(await db.paymentEvent.count({ where: { paymentId } })).toBe(1);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toEqual(afterFirst);
  });

  it("rejects anything PayMongo did not sign for this account and mode", async () => {
    const { paymentId, sessionId } = await onlinePayment(30000);
    const body = paidEvent({ sessionId, amount: 30000 });
    const tampered = body.replace("30000", "100");
    const before = await db.paymentEvent.count();

    for (const [raw, headers] of [
      [tampered, signed(body)],
      [body, new Headers()],
      [body, signed(body, { secret: "whsk_someone_else" })],
      // A live signature does not count while we use a test key.
      [body, signed(body, { mode: "li" })],
    ] as const) {
      expect(await handleWebhook(paymongo, raw, headers)).toBe("rejected");
    }

    expect(await db.paymentEvent.count()).toBe(before);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ status: "unpaid", capturedCents: 0 });
  });

  it("records but does not apply a paid amount that differs from the Payment", async () => {
    const { paymentId, sessionId } = await onlinePayment(45000);
    const body = paidEvent({ sessionId, amount: 100 });

    expect(await handleWebhook(paymongo, body, signed(body))).toBe("mismatch");

    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ status: "unpaid", capturedCents: 0 });
    const [event] = await db.paymentEvent.findMany({ where: { paymentId } });
    expect(event.processedAt).toBeNull();
  });

  it("keeps an event for a Payment it cannot find, unprocessed", async () => {
    const body = paidEvent({ sessionId: "cs_not_ours", amount: 1000 });

    expect(await handleWebhook(paymongo, body, signed(body))).toBe("unmatched");

    const event = await db.paymentEvent.findFirstOrThrow({
      where: {
        payload: {
          path: ["data", "attributes", "data", "id"],
          equals: "cs_not_ours",
        },
      },
    });
    expect(event).toMatchObject({ paymentId: null, processedAt: null });
  });
});
