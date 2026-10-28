import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getCart, setLineNote, setLineQuantity } from "@/modules/cart";
import { getDefaultAddress } from "@/modules/customers";
import { resolveZone } from "@/modules/delivery";
import { requestStockAlert } from "@/modules/inventory";
import { cancelOrder, placeOrder } from "@/modules/orders";
import { eraseCustomer, exportCustomerData } from "@/server/customer-data";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

// A Customer's data on request (PRD section 7, Data Privacy Act): all of
// it as a download, and an account deleted down to the tax record.
const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
const HUB = seedId("hub:pasig");
const MILK = seedId("product:magnolia-fresh-milk");
const UBE = seedId("product:ube-roll"); // seeded sold out

let ligaya: string;
let orderId: string;
let claimId: string;

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
  ligaya = (
    await db.customer.findUniqueOrThrow({
      where: { email: "ligaya@example.com" },
    })
  ).id;
  await db.authUser.create({
    data: {
      id: "auth-ligaya",
      name: "Ligaya",
      email: "ligaya@example.com",
      customer: { connect: { id: ligaya } },
    },
  });

  await db.zone.updateMany({ data: { minOrderCents: 0 } });
  const owner = { customerId: ligaya };
  await setLineQuantity(owner, MILK, 2, HUB);
  await setLineNote(owner, MILK, "The coldest ones, please");
  const address = (await getDefaultAddress(ligaya))!;
  const zone = (await resolveZone(address))!;
  const slot = await db.slot.findFirstOrThrow({
    where: { hubId: HUB },
    orderBy: { startsAt: "asc" },
  });
  const placed = await placeOrder({
    customerId: ligaya,
    addressId: address.id,
    slotId: slot.id,
    contactPhone: "+639171234501",
    riderNotes: "Call when outside",
    paymentMethod: "cod",
    expectedTotalCents: (
      await getCart(owner, { hubId: HUB, zone: zone.fees, now: NOW })
    ).priced.totalCents,
    idempotencyKey: randomUUID(),
    now: NOW,
  });
  if (!placed.ok) throw new Error(placed.reason);
  orderId = placed.orderId;

  await db.shoppingList.create({
    data: { customerId: ligaya, name: "Weekly" },
  });
  await db.stockLevel.updateMany({
    where: { productId: UBE },
    data: { onHand: 0, reserved: 0 },
  });
  expect(await requestStockAlert(ligaya, UBE)).toBe(true);
  await db.notification.create({
    data: {
      template: "order_confirmed",
      channel: "sms",
      recipient: "+639171234501",
      orderId,
      provider: "console",
    },
  });
  const line = await db.orderLine.findFirstOrThrow({ where: { orderId } });
  claimId = (
    await db.freshnessClaim.create({
      data: {
        orderId,
        orderLineId: line.id,
        customerId: ligaya,
        reason: "damaged",
        units: 1,
        note: "The carton leaked",
        photoUrls: ["/media/claims/test-leak.webp"],
        claimedCents: 11500,
      },
    })
  ).id;
}, 60_000);
afterAll(() => db.$disconnect());

describe("exportCustomerData", () => {
  it("gathers everything the shop keeps about the Customer", async () => {
    const data = await exportCustomerData(ligaya);
    expect(data.profile).toMatchObject({
      name: "Ligaya Dimaculangan",
      email: "ligaya@example.com",
      phone: "+639171234501",
    });
    expect(data.addresses[0]).toMatchObject({ barangay: "Kapitolyo" });
    expect(data.orders[0]).toMatchObject({
      contactPhone: "+639171234501",
      riderNotes: "Call when outside",
      lines: [
        expect.objectContaining({
          orderedQty: 2,
          note: "The coldest ones, please",
        }),
      ],
    });
    expect(data.shoppingLists).toEqual([
      expect.objectContaining({ name: "Weekly" }),
    ]);
    expect(data.stockAlerts).toHaveLength(1);
    expect(data.claims[0]).toMatchObject({ note: "The carton leaked" });
    expect(data.messages).toEqual([
      expect.objectContaining({ channel: "sms", recipient: "+639171234501" }),
    ]);
    expect(data.vouchers).toEqual([]);
  });
});

describe("eraseCustomer", () => {
  it("waits until no Order or claim is open", async () => {
    expect(await eraseCustomer(ligaya)).toEqual({
      ok: false,
      reason: "open_orders",
    });
    await cancelOrder(ligaya, orderId);
    expect(await eraseCustomer(ligaya)).toEqual({
      ok: false,
      reason: "claim_open",
    });
    await db.freshnessClaim.update({
      where: { id: claimId },
      data: { status: "rejected", decidedAt: new Date() },
    });
  });

  it("removes the person and keeps the Order's money and items", async () => {
    const before = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(await eraseCustomer(ligaya)).toEqual({ ok: true });

    expect(
      await db.customer.findUniqueOrThrow({ where: { id: ligaya } })
    ).toMatchObject({
      name: "Deleted customer",
      email: null,
      phone: null,
      authUserId: null,
      marketingOptIn: false,
      referralCode: null,
    });
    expect(await db.authUser.count({ where: { id: "auth-ligaya" } })).toBe(0);
    for (const count of [
      db.address.count({ where: { customerId: ligaya } }),
      db.cart.count({ where: { customerId: ligaya } }),
      db.shoppingList.count({ where: { customerId: ligaya } }),
      db.stockAlert.count({ where: { customerId: ligaya } }),
    ]) {
      expect(await count).toBe(0);
    }

    const order = await db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { lines: true },
    });
    expect(order).toMatchObject({
      contactPhone: "",
      riderNotes: null,
      deliveryPin: null,
      addressSnapshot: {},
      totalCents: before.totalCents,
      orderNo: before.orderNo,
    });
    expect(order.lines.map((l) => l.note)).toEqual([null]);
    expect(order.lines[0].nameSnapshot).toContain("Fresh Milk");

    expect(
      await db.freshnessClaim.findUniqueOrThrow({ where: { id: claimId } })
    ).toMatchObject({ note: "", photoUrls: [] });
    expect(
      await db.notification.findFirstOrThrow({ where: { orderId } })
    ).toMatchObject({ recipient: "deleted" });
  });
});
