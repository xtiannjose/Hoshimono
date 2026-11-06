import { createHmac, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  cancelUnpaidByStaff,
  confirmPaidOrder,
  ORDER_CANCELLED_JOB,
  ORDER_CONFIRMED_JOB,
  recordRefundByStaff,
} from "@/modules/orders";
import {
  createPaymongo,
  handleWebhook,
  listRefundsToCheck,
  recordPaidByStaff,
  REFUND_JOB,
  refundOrderPayment,
  sendRefund,
  settleRefund,
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

    const payment = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(payment).toMatchObject({ status: "paid", capturedCents: 69400 });
    // PayMongo's id of the payment itself: refunds name it, not the session.
    expect(payment.paymentRef).toMatch(/^pay_/);
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

  it("refunds money that arrives after the Order was cancelled, and leaves it cancelled", async () => {
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
    // The money did arrive, and all of it goes back.
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({
      status: "refunded",
      capturedCents: 28000,
      refundedCents: 28000,
    });
    const [refund] = await db.refund.findMany({ where: { paymentId } });
    expect(refund).toMatchObject({
      reason: "late_payment",
      amountCents: 28000,
      status: "pending",
    });
    expect(await queued(REFUND_JOB, "refundId", refund.id)).toBe(1);
  });
});

describe("a payment applied twice, or by hand", () => {
  it("ignores a second paid event for a Payment already paid: no refund", async () => {
    const { paymentId, sessionId } = await onlinePayment(30000);
    const first = paidEvent({ sessionId, amount: 30000 });
    expect(
      await handleWebhook(paymongo, first, signed(first), {
        onPaid: confirmPaidOrder,
      })
    ).toBe("applied");
    // A different event id for the same checkout: not a duplicate delivery.
    const second = paidEvent({ sessionId, amount: 30000 });
    expect(
      await handleWebhook(paymongo, second, signed(second), {
        onPaid: confirmPaidOrder,
      })
    ).toBe("recorded");
    expect(await db.refund.count({ where: { paymentId } })).toBe(0);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ status: "paid", capturedCents: 30000 });
  });

  it("lets staff record money PayMongo shows when no webhook applied it", async () => {
    const { paymentId } = await onlinePayment(41000);
    const { orderId } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    expect(
      await recordPaidByStaff(orderId, "pay_seen_in_dashboard", {
        onPaid: confirmPaidOrder,
      })
    ).toBe("applied");
    expect(
      await db.order.findUniqueOrThrow({ where: { id: orderId } })
    ).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({
      status: "paid",
      capturedCents: 41000,
      paymentRef: "pay_seen_in_dashboard",
    });
    // Once is enough.
    expect(
      await recordPaidByStaff(orderId, "pay_again", {
        onPaid: confirmPaidOrder,
      })
    ).toBe("not_waiting");
  });

  it("refunds money staff record for an Order that already closed", async () => {
    const { paymentId } = await onlinePayment(22000);
    const { orderId } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    await db.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
    await db.payment.update({
      where: { id: paymentId },
      data: { status: "failed" },
    });
    expect(
      await recordPaidByStaff(orderId, "pay_late", { onPaid: confirmPaidOrder })
    ).toBe("late");
    expect(
      await db.refund.findFirstOrThrow({ where: { paymentId } })
    ).toMatchObject({ reason: "late_payment", amountCents: 22000 });
  });
});

/** Jobs of `kind` whose payload has `key` set to `value`. */
async function queued(kind: string, key: string, value: string) {
  const jobs = await db.job.findMany({ where: { kind } });
  return jobs.filter(
    (j) => (j.payload as Record<string, unknown>)[key] === value
  ).length;
}

describe("an Order PayMongo charged a different amount (ADR 0023)", () => {
  it("staff close it: its Payment fails, the Customer is told, the right money later goes back", async () => {
    const { paymentId, sessionId } = await onlinePayment(28000);
    const { orderId, order } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { order: true },
    });
    await db.slot.update({
      where: { id: order.slotId },
      data: { booked: { increment: 1 } },
    });
    const wrong = paidEvent({ sessionId, amount: 25000 });
    expect(
      await handleWebhook(paymongo, wrong, signed(wrong), {
        onPaid: confirmPaidOrder,
      })
    ).toBe("mismatch");

    const staff = seedId("staff:admin");
    expect(await cancelUnpaidByStaff(orderId, staff, " ")).toMatchObject({
      ok: false,
      errors: { reason: expect.any(String) },
    });
    expect(
      await cancelUnpaidByStaff(
        orderId,
        staff,
        "PayMongo took ₱250.00; refunded in its dashboard"
      )
    ).toEqual({ ok: true });
    expect(
      await db.order.findUniqueOrThrow({ where: { id: orderId } })
    ).toMatchObject({ status: "cancelled", paymentStatus: "failed" });
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: paymentId } })
    ).toMatchObject({ status: "failed" });
    expect(await queued(ORDER_CANCELLED_JOB, "orderId", orderId)).toBe(1);
    expect(await cancelUnpaidByStaff(orderId, staff, "Again")).toEqual({
      ok: false,
      reason: "not_waiting",
    });

    // The right amount arriving after all is refunded as late.
    const right = paidEvent({ sessionId, amount: 28000 });
    expect(
      await handleWebhook(paymongo, right, signed(right), {
        onPaid: confirmPaidOrder,
      })
    ).toBe("late");
  });
});

describe("refunds", () => {
  /** An Order paid online through a real paid webhook. */
  async function paid(amountCents = 69400) {
    const { paymentId, sessionId } = await onlinePayment(amountCents);
    const body = paidEvent({ sessionId, amount: amountCents });
    await handleWebhook(paymongo, body, signed(body));
    return db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }

  /** A provider whose refunds answer `reply`, recording each call. */
  function refunder(
    reply: () => Promise<
      { ok: true; refundRef: string } | { ok: false; reason: string }
    >
  ) {
    const calls: { paymentRef: string; amountCents: number }[] = [];
    const provider = {
      name: "paymongo",
      refund: async (paymentRef: string, amountCents: number) => {
        calls.push({ paymentRef, amountCents });
        return reply();
      },
    } as unknown as PaymentProvider;
    return { providerFor: () => provider, calls };
  }

  it("refunds what is left, once per reason, never more than was paid", async () => {
    const payment = await paid(69400);
    const refund = (reason: "picked" | "cancelled", amount?: number) =>
      db.$transaction((tx) =>
        refundOrderPayment(tx, payment.orderId, reason, amount)
      );

    expect(await refund("picked", 5000)).toBe(5000);
    expect(await refund("picked", 5000)).toBe(0);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: payment.id } })
    ).toMatchObject({ status: "partially_refunded", refundedCents: 5000 });
    // Cancelling after that gives back the rest, not the whole amount again.
    expect(await refund("cancelled")).toBe(64400);
    expect(
      await db.payment.findUniqueOrThrow({ where: { id: payment.id } })
    ).toMatchObject({ status: "refunded", refundedCents: 69400 });
    expect(await refund("cancelled")).toBe(0);
    expect(await db.refund.count({ where: { paymentId: payment.id } })).toBe(2);
  });

  it("sends a refund once", async () => {
    const payment = await paid(30000);
    await db.$transaction((tx) =>
      refundOrderPayment(tx, payment.orderId, "cancelled")
    );
    const { id } = await db.refund.findFirstOrThrow({
      where: { paymentId: payment.id },
    });
    const { providerFor, calls } = refunder(async () => ({
      ok: true,
      refundRef: "ref_123",
    }));

    await sendRefund(id, providerFor);
    await sendRefund(id, providerFor);

    expect(calls).toEqual([
      { paymentRef: payment.paymentRef, amountCents: 30000 },
    ]);
    const refund = await db.refund.findUniqueOrThrow({ where: { id } });
    expect(refund).toMatchObject({ status: "sent", providerRef: "ref_123" });
    expect(refund.sentAt).not.toBeNull();
  });

  it("tries again later when the provider says no", async () => {
    const payment = await paid(30000);
    await db.$transaction((tx) =>
      refundOrderPayment(tx, payment.orderId, "cancelled")
    );
    const { id } = await db.refund.findFirstOrThrow({
      where: { paymentId: payment.id },
    });
    const { providerFor } = refunder(async () => ({
      ok: false,
      reason: "PayMongo 400 on /v1/refunds: insufficient balance",
    }));

    await expect(sendRefund(id, providerFor)).rejects.toThrow(
      "insufficient balance"
    );

    expect(await db.refund.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "pending",
      lastError: "PayMongo 400 on /v1/refunds: insufficient balance",
    });
  });

  it("never sends again when it cannot tell whether a refund went through", async () => {
    const payment = await paid(30000);
    await db.$transaction((tx) =>
      refundOrderPayment(tx, payment.orderId, "cancelled")
    );
    const { id } = await db.refund.findFirstOrThrow({
      where: { paymentId: payment.id },
    });
    const { providerFor, calls } = refunder(async () => {
      throw new TypeError("fetch failed");
    });

    await sendRefund(id, providerFor);
    await sendRefund(id, providerFor);

    expect(calls).toHaveLength(1);
    expect(await db.refund.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "needs_review",
      lastError: "TypeError: fetch failed",
    });

    // A run that stopped mid-call left it sending: same, a person checks.
    await db.refund.update({ where: { id }, data: { status: "sending" } });
    await sendRefund(id, providerFor);
    expect(calls).toHaveLength(1);
    expect((await db.refund.findUniqueOrThrow({ where: { id } })).status).toBe(
      "needs_review"
    );
  });
});

describe("refunds to check", () => {
  /** A paid online Order whose refund is now in `status`. */
  async function refundIn(
    status: "pending" | "sending" | "sent" | "needs_review",
    lastError: string | null = null
  ) {
    const { paymentId, sessionId } = await onlinePayment(30000);
    const body = paidEvent({ sessionId, amount: 30000 });
    await handleWebhook(paymongo, body, signed(body));
    const { orderId } = await db.payment.findUniqueOrThrow({
      where: { id: paymentId },
    });
    await db.$transaction((tx) => refundOrderPayment(tx, orderId, "cancelled"));
    const refund = await db.refund.findFirstOrThrow({ where: { paymentId } });
    return db.refund.update({
      where: { id: refund.id },
      data: { status, lastError },
    });
  }

  it("lists the refunds a person must look at: unclear, or still failing", async () => {
    const unclear = await refundIn("needs_review", "TypeError: fetch failed");
    const failing = await refundIn("pending", "PayMongo 400: balance");
    await refundIn("pending");
    await refundIn("sent");

    const listed = await listRefundsToCheck();
    const ids = listed.map((r) => r.id);
    expect(ids).toContain(unclear.id);
    expect(ids).toContain(failing.id);
    expect(listed.find((r) => r.id === unclear.id)).toMatchObject({
      amountCents: 30000,
      reason: "cancelled",
      status: "needs_review",
      lastError: "TypeError: fetch failed",
      paymentRef: expect.stringMatching(/^pay_/),
      orderNo: expect.stringMatching(/^SW-/),
    });
    expect(
      listed.every((r) => r.status === "needs_review" || r.lastError !== null)
    ).toBe(true);
  });

  it("marks a refund that went through as sent, and the Customer is told", async () => {
    const refund = await refundIn("needs_review", "TypeError: fetch failed");

    expect(await settleRefund(refund.id, "sent", "ref_from_dashboard")).toBe(
      true
    );
    expect(await settleRefund(refund.id, "sent")).toBe(false);

    expect(
      await db.refund.findUniqueOrThrow({ where: { id: refund.id } })
    ).toMatchObject({
      status: "sent",
      providerRef: "ref_from_dashboard",
      lastError: null,
    });
    // The refund job sends nothing more for a sent refund, only the notice.
    expect(await queued(REFUND_JOB, "refundId", refund.id)).toBe(2);
  });

  it("sends again a refund that did not go through", async () => {
    const refund = await refundIn("needs_review", "TypeError: fetch failed");

    expect(await settleRefund(refund.id, "retry")).toBe(true);

    expect(
      await db.refund.findUniqueOrThrow({ where: { id: refund.id } })
    ).toMatchObject({ status: "pending", lastError: null });
    expect(await queued(REFUND_JOB, "refundId", refund.id)).toBe(2);
    // A sent refund is never sent again.
    const sent = await refundIn("sent");
    expect(await settleRefund(sent.id, "retry")).toBe(false);
  });

  it("clears a refund paid back another way, without the GCash or card message", async () => {
    const refund = await refundIn("needs_review", "PayMongo 400: balance");

    expect(await settleRefund(refund.id, "elsewhere", " ")).toBe(false);
    expect(
      await settleRefund(refund.id, "elsewhere", "GCash sent by hand, ref 1234")
    ).toBe(true);

    expect(
      await db.refund.findUniqueOrThrow({ where: { id: refund.id } })
    ).toMatchObject({
      status: "sent",
      paidBackBy: "GCash sent by hand, ref 1234",
      providerRef: null,
    });
    // Only the first send was queued: nothing more goes to the Customer.
    expect(await queued(REFUND_JOB, "refundId", refund.id)).toBe(1);
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
      refund: async () => ({ ok: true, refundRef: "ref_unused" }),
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

describe("refunds staff record (ADR 0023)", () => {
  /** An online Order paid through a real paid webhook. */
  async function paidOrder(amountCents: number) {
    const { paymentId, sessionId } = await onlinePayment(amountCents);
    const body = paidEvent({ sessionId, amount: amountCents });
    await handleWebhook(paymongo, body, signed(body));
    return (await db.payment.findUniqueOrThrow({ where: { id: paymentId } }))
      .orderId;
  }

  it("records refunds made in PayMongo's dashboard, and the Customer is told", async () => {
    const orderId = await paidOrder(30000);
    const dashboard = { providerRef: "ref_dashboard_1", paidBackBy: "" };
    expect(
      await recordRefundByStaff(orderId, { ...dashboard, amountCents: 30001 })
    ).toEqual({
      ok: false,
      errors: { amount: "Up to ₱300.00 is left to give back." },
    });
    expect(
      await recordRefundByStaff(orderId, {
        amountCents: 10000,
        providerRef: " ",
        paidBackBy: "",
      })
    ).toMatchObject({ ok: false, errors: { how: expect.any(String) } });

    expect(
      await recordRefundByStaff(orderId, { ...dashboard, amountCents: 10000 })
    ).toEqual({ ok: true });
    expect(
      await recordRefundByStaff(orderId, {
        amountCents: 20000,
        providerRef: "ref_dashboard_2",
        paidBackBy: "",
      })
    ).toEqual({ ok: true });

    const refunds = await db.refund.findMany({
      where: { payment: { orderId } },
      orderBy: { amountCents: "asc" },
    });
    expect(refunds).toMatchObject([
      { reason: "staff", status: "sent", providerRef: "ref_dashboard_1" },
      { reason: "staff", status: "sent", providerRef: "ref_dashboard_2" },
    ]);
    expect(await queued(REFUND_JOB, "refundId", refunds[0].id)).toBe(1);
    expect(
      await db.order.findUniqueOrThrow({ where: { id: orderId } })
    ).toMatchObject({ paymentStatus: "refunded" });
  });

  it("records cash given back on a cash Order, with no GCash or card message", async () => {
    const { orderId } = await db.payment.update({
      where: { id: (await onlinePayment(50000)).paymentId },
      data: { method: "cod", status: "cod_collected", capturedCents: 50000 },
    });
    expect(
      await recordRefundByStaff(orderId, {
        amountCents: 5000,
        providerRef: "",
        paidBackBy: "",
      })
    ).toMatchObject({ ok: false, errors: { how: expect.any(String) } });
    expect(
      await recordRefundByStaff(orderId, {
        amountCents: 5000,
        providerRef: "",
        paidBackBy: "Cash with the next delivery",
      })
    ).toEqual({ ok: true });
    const payment = await db.payment.findFirstOrThrow({ where: { orderId } });
    // Still counted as the Rider's cash for the day (ADR 0011).
    expect(payment).toMatchObject({
      status: "cod_collected",
      refundedCents: 5000,
    });
    const refund = await db.refund.findFirstOrThrow({
      where: { paymentId: payment.id },
    });
    expect(await queued(REFUND_JOB, "refundId", refund.id)).toBe(0);
  });
});
