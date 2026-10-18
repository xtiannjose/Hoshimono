import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setLineQuantity } from "@/modules/cart";
import { getDefaultAddress } from "@/modules/customers";
import { sendOrderConfirmed, type Sent } from "@/modules/notifications";
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
});
