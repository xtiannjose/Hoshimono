import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setLineQuantity } from "@/modules/cart";
import { getDefaultAddress } from "@/modules/customers";
import {
  sendDeliveryFailed,
  sendOrderConfirmed,
  sendOutForDelivery,
  sendRefundIssued,
  sendSubstitutionAsked,
  type Sent,
} from "@/modules/notifications";
import { placeOrder } from "@/modules/orders";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
let orderId: string;

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
  const customer = await db.customer.findUniqueOrThrow({
    where: { email: "ligaya@example.com" },
  });
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
  await setLineQuantity(
    { customerId: customer.id },
    seedId("product:magnolia-fresh-milk"),
    1,
    seedId("hub:pasig")
  );
  const slot = await db.slot.findFirstOrThrow({ orderBy: { startsAt: "asc" } });
  const result = await placeOrder({
    customerId: customer.id,
    addressId: (await getDefaultAddress(customer.id))!.id,
    slotId: slot.id,
    contactPhone: "0917 123 4567",
    paymentMethod: "cod",
    expectedTotalCents: 11500 + 4900,
    idempotencyKey: randomUUID(),
    now: NOW,
  });
  if (!result.ok) throw new Error(result.reason);
  orderId = result.orderId;
}, 60_000);
afterAll(() => db.$disconnect());

function recorder() {
  const sent: { channel: string; to: string; text: string }[] = [];
  const ok: Sent = { provider: "test", ref: "r1" };
  const channel = (name: string) => ({
    send: async (m: { to: string; text: string }) => {
      sent.push({ channel: name, to: m.to, text: m.text });
      return ok;
    },
  });
  return { sent, providers: { email: channel("email"), sms: channel("sms") } };
}

const notice = () => ({
  orderId,
  orderNo: "SW-261002-TEST",
  email: "ligaya@example.com",
  phone: "+639171234567",
  slot: "Today, 8:00 to 10:00 AM",
  total: "₱164.00",
  trackingUrl: "http://localhost:3000/orders/SW-261002-TEST",
  lines: [{ name: "Magnolia Fresh Milk", quantity: 1 }],
  cashOnDelivery: true,
  estimated: false,
});

describe("sendOrderConfirmed", () => {
  it("emails and texts once, even when the job runs again", async () => {
    const { sent, providers } = recorder();
    await sendOrderConfirmed(notice(), providers);
    await sendOrderConfirmed(notice(), providers);
    expect(sent.map((s) => [s.channel, s.to])).toEqual([
      ["email", "ligaya@example.com"],
      ["sms", "+639171234567"],
    ]);
    expect(sent[1].text).toContain("SW-261002-TEST");
    expect(sent[1].text).toContain("₱164.00 ready in cash");
    expect(await db.notification.count({ where: { orderId } })).toBe(2);
  });

  it("after a failed SMS, the retry sends only the SMS", async () => {
    await db.notification.deleteMany({ where: { orderId } });
    const { sent, providers } = recorder();
    let smsDown = true;
    const flaky = {
      email: providers.email,
      sms: {
        send: async (m: { to: string; text: string }) => {
          if (smsDown) throw new Error("SMS gateway down");
          return providers.sms.send(m);
        },
      },
    };
    await expect(sendOrderConfirmed(notice(), flaky)).rejects.toThrow(
      "SMS gateway down"
    );
    smsDown = false;
    await sendOrderConfirmed(notice(), flaky);
    expect(sent.map((s) => s.channel)).toEqual(["email", "sms"]);
    expect(await db.notification.count({ where: { orderId } })).toBe(2);
  });

  it("calls a weighed total an estimate", async () => {
    await db.notification.deleteMany({ where: { orderId } });
    const { sent, providers } = recorder();
    await sendOrderConfirmed({ ...notice(), estimated: true }, providers);
    expect(sent[1].text).toContain("about ₱164.00");
    expect(sent[1].text).toContain("follows the weight");
  });
});

describe("sendRefundIssued", () => {
  const refund = (reason: "cancelled" | "picked" | "late_payment") => ({
    orderId,
    orderNo: "SW-261002-TEST",
    email: "ligaya@example.com",
    phone: "+639171234567",
    amount: "₱134.50",
    method: "gcash" as const,
    reason,
    trackingUrl: "http://localhost:3000/orders/SW-261002-TEST",
  });

  it("tells the Customer how much went back and why, once per refund", async () => {
    await db.notification.deleteMany({ where: { orderId } });
    const { sent, providers } = recorder();
    await sendRefundIssued(refund("picked"), providers);
    await sendRefundIssued(refund("picked"), providers);
    await sendRefundIssued(refund("cancelled"), providers);

    expect(sent.map((s) => s.channel)).toEqual([
      "email",
      "sms",
      "email",
      "sms",
    ]);
    expect(sent[1].text).toContain("₱134.50");
    expect(sent[1].text).toContain("to your GCash");
    expect(sent[1].text).toContain("came to less than you paid");
    expect(sent[3].text).toContain("cancelled order SW-261002-TEST");
    // No em-dashes in Customer copy (CLAUDE.md).
    expect(sent.every((s) => !s.text.includes("—"))).toBe(true);
  });
});

describe("sendSubstitutionAsked", () => {
  const asked = {
    orderId: "",
    orderNo: "SW-261002-TEST",
    substitutionId: "sub-1",
    email: "ligaya@example.com",
    phone: "+639171234567",
    ordered: "Magnolia Fresh Milk",
    substitute: "Nestle Low Fat Milk",
    quantity: 2,
    unitPrice: "₱98.00",
    until: "3:42 PM",
    link: "http://localhost:3000/s/abc123",
  };

  it("asks once per Substitution, with the link and what silence means", async () => {
    const { sent, providers } = recorder();
    const notice = { ...asked, orderId };
    await sendSubstitutionAsked(notice, providers);
    await sendSubstitutionAsked(notice, providers);

    expect(sent.map((s) => s.channel)).toEqual(["email", "sms"]);
    const sms = sent[1].text;
    expect(sms).toContain("Magnolia Fresh Milk");
    expect(sms).toContain("2 x Nestle Low Fat Milk at ₱98.00 each");
    expect(sms).toContain("http://localhost:3000/s/abc123");
    expect(sms).toContain("by 3:42 PM");
    expect(sms).toContain("No reply means yes");
    expect(sent.every((s) => !s.text.includes("—"))).toBe(true);
  });
});

describe("delivery messages", () => {
  const base = {
    orderNo: "SW-261002-TEST",
    email: "ligaya@example.com",
    phone: "+639171234567",
  };

  it("says who is coming, the PIN and the cash due, once per trip", async () => {
    await db.notification.deleteMany({ where: { orderId } });
    const { sent, providers } = recorder();
    const notice = {
      ...base,
      orderId,
      trip: "2026-10-02T08:00:00.000Z",
      riderName: "Jun Dela Rosa",
      riderPhone: "+639171234599",
      pin: "4821",
      cashDue: "₱624.00",
      trackingUrl: "http://localhost:3000/orders/SW-261002-TEST",
    };
    await sendOutForDelivery(notice, providers);
    await sendOutForDelivery(notice, providers);
    expect(sent.map((s) => s.channel)).toEqual(["email", "sms"]);
    expect(sent[1].text).toContain(
      "on its way with Jun Dela Rosa (+639171234599)"
    );
    expect(sent[1].text).toContain("PIN at the door: 4821");
    expect(sent[1].text).toContain("₱624.00 ready in cash");

    // A second trip after a failed try is a new message.
    await sendOutForDelivery(
      { ...notice, trip: "2026-10-02T10:00:00.000Z" },
      providers
    );
    expect(sent).toHaveLength(4);
  });

  it("tells the Customer a delivery missed them, without staff notes", async () => {
    await db.notification.deleteMany({ where: { orderId } });
    const { sent, providers } = recorder();
    await sendDeliveryFailed({ ...base, orderId, trip: "t1" }, providers);
    expect(sent[1].text).toContain("could not deliver order SW-261002-TEST");
    expect(sent[1].text).toContain("call you");
    expect(sent.every((s) => !s.text.includes("—"))).toBe(true);
  });
});
