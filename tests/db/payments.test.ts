import { createHmac, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { confirmPaidOrder, ORDER_CONFIRMED_JOB } from "@/modules/orders";
import {
  createPaymongo,
  handleWebhook,
  startCheckout,
  type CheckoutRequest,
  type PaymentProvider,
} from "@/modules/payments";

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

describe("a paid webhook and its Order", () => {
  it("confirms the Order and queues its notice in the same transaction", async () => {
    const { paymentId, sessionId } = await onlinePayment(61000);
    const { orderId } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    const body = paidEvent({ sessionId, amount: 61000 });

    expect(
      await handleWebhook(paymongo, body, signed(body), {
        onPaid: confirmPaidOrder,
      })
    ).toBe("applied");

    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { statusEvents: true },
    });
    expect(order).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
    expect(order.statusEvents).toEqual([
      expect.objectContaining({
        from: "pending_payment",
        to: "confirmed",
        actorType: "system",
      }),
    ]);
    const jobs = await db.job.findMany({
      where: { kind: ORDER_CONFIRMED_JOB },
    });
    expect(
      jobs.filter(
        (j) => (j.payload as { orderId?: string }).orderId === orderId
      )
    ).toHaveLength(1);
  });

  it("flags money that arrives after the Order was cancelled, and leaves it cancelled", async () => {
    const { paymentId, sessionId } = await onlinePayment(28000);
    const { orderId } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    await db.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
    const body = paidEvent({ sessionId, amount: 28000 });

    expect(
      await handleWebhook(paymongo, body, signed(body), {
        onPaid: confirmPaidOrder,
      })
    ).toBe("late");

    expect(
      await db.order.findUniqueOrThrow({ where: { id: orderId } })
    ).toMatchObject({
      status: "cancelled",
    });
    // The money did arrive: the Payment says so, and a refund is owed.
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ status: "paid", capturedCents: 28000 });
  });
});

describe("startCheckout", () => {
  /** A provider that hands out numbered sessions and records what it did. */
  function fakeProvider() {
    const created: CheckoutRequest[] = [];
    const expired: string[] = [];
    const provider: PaymentProvider = {
      name: "paymongo",
      async createCheckout(request) {
        created.push(request);
        const n = created.length;
        // A slow provider, so two requests at once really overlap.
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          providerRef: `cs_fake_${n}_${randomUUID().slice(0, 8)}`,
          redirectUrl: `https://pay.example/${n}`,
        };
      },
      async expireCheckout(ref) {
        expired.push(ref);
        return "expired";
      },
      capture: async () => {},
      refund: async () => ({ refundRef: "ref_unused" }),
      verifyWebhook: () => false,
      parseEvent: () => {
        throw new Error("unused");
      },
    };
    return { provider, created, expired };
  }

  /** An unpaid online Payment without a session yet. */
  async function waiting(amountCents = 51000) {
    const { paymentId } = await onlinePayment(amountCents);
    await db.payment.update({
      where: { id: paymentId },
      data: { providerRef: null },
    });
    const { orderId } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    return { paymentId, orderId };
  }

  const urls = {
    orderNo: "SW-201026-TEST",
    successUrl: "https://hoshimono.test/checkout/return/SW-201026-TEST",
    cancelUrl: "https://hoshimono.test/checkout",
  };

  it("opens one session per Order and sends the Customer back to it", async () => {
    const { paymentId, orderId } = await waiting(51000);
    const { provider, created } = fakeProvider();

    const first = await startCheckout(provider, { orderId, ...urls });
    const again = await startCheckout(provider, { orderId, ...urls });

    expect(first).toBe("https://pay.example/1");
    expect(again).toBe(first);
    expect(created).toEqual([
      {
        reference: "SW-201026-TEST",
        description: "Hoshimono order SW-201026-TEST",
        amountCents: 51000,
        methods: ["gcash"],
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
      },
    ]);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ checkoutUrl: "https://pay.example/1" });
  });

  it("keeps one live session when two requests race, expiring the other", async () => {
    const { paymentId, orderId } = await waiting(47000);
    const { provider, created, expired } = fakeProvider();

    const [a, b] = await Promise.all([
      startCheckout(provider, { orderId, ...urls }),
      startCheckout(provider, { orderId, ...urls }),
    ]);

    expect(a).toBe(b);
    const payment = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(payment.checkoutUrl).toBe(a);
    // Every session but the kept one is expired, so only one can be paid.
    expect(expired).toHaveLength(created.length - 1);
    expect(expired).not.toContain(payment.providerRef);
  });

  it("has nothing to open for an Order that is already paid", async () => {
    const { paymentId, orderId } = await waiting(33000);
    await db.payment.update({
      where: { id: paymentId },
      data: { status: "paid" },
    });
    const { provider, created } = fakeProvider();

    expect(await startCheckout(provider, { orderId, ...urls })).toBeNull();
    expect(created).toHaveLength(0);
  });
});
