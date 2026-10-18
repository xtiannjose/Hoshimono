import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getCart, setLineQuantity, type CartOwner } from "@/modules/cart";
import { getDefaultAddress } from "@/modules/customers";
import { holdSlot, resolveZone } from "@/modules/delivery";
import {
  cancelOrder,
  expireUnpaidOrders,
  getOrder,
  listOrders,
  ORDER_CONFIRMED_JOB,
  placeOrder,
  transitionOrder,
  type PlaceOrderInput,
} from "@/modules/orders";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
// In the past, so status changes stamped with the real clock come after it.
const NOW = new Date("2026-10-01T20:00:00Z");
const HUB = seedId("hub:pasig");
const MILK = seedId("product:magnolia-fresh-milk");
const LIEMPO = seedId("product:pork-belly-liempo");
const ALT_MILK = seedId("product:nestle-low-fat-milk");

let ligaya: string;
let paolo: string;
let slots: string[];

const owner = (customerId: string): CartOwner => ({ customerId });

/** What the Customer sees at Checkout, for expectedTotalCents. */
async function shownTotal(customerId: string): Promise<number> {
  const address = (await getDefaultAddress(customerId))!;
  const zone = (await resolveZone(address))!;
  return (
    await getCart(owner(customerId), { hubId: zone.hubId, zone: zone.fees })
  ).priced.totalCents;
}

async function checkout(
  customerId: string,
  over: Partial<PlaceOrderInput> = {}
): Promise<PlaceOrderInput> {
  return {
    customerId,
    addressId: (await getDefaultAddress(customerId))!.id,
    slotId: slots[0],
    contactPhone: "+639171234567",
    riderNotes: "Call when outside",
    paymentMethod: "cod",
    expectedTotalCents: await shownTotal(customerId),
    idempotencyKey: randomUUID(),
    now: NOW,
    ...over,
  };
}

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
  ligaya = (
    await db.customer.findUniqueOrThrow({
      where: { email: "ligaya@example.com" },
    })
  ).id;
  paolo = (
    await db.customer.findUniqueOrThrow({
      where: { email: "paolo@example.com" },
    })
  ).id;
  slots = (
    await db.slot.findMany({
      where: { hubId: HUB },
      orderBy: { startsAt: "asc" },
      take: 3,
    })
  ).map((s) => s.id);
}, 60_000);

beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE jobs, notifications, order_status_events, payments, stock_movements, order_lines, orders, slot_holds, cart_lines, carts CASCADE"
  );
  await db.slot.updateMany({ data: { booked: 0, capacity: 20 } });
  await db.stockLevel.updateMany({
    where: { productId: { in: [MILK, LIEMPO] } },
    data: { onHand: 40, reserved: 0 },
  });
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
  await db.product.update({ where: { id: MILK }, data: { priceCents: 11500 } });
});
afterAll(() => db.$disconnect());

describe("placeOrder", () => {
  it("turns the Cart into a confirmed COD Order with snapshots, a reservation and a booked Slot", async () => {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    await setLineQuantity(owner(ligaya), LIEMPO, 1, HUB);
    const total = await shownTotal(ligaya);
    const result = await placeOrder(await checkout(ligaya));
    expect(result).toMatchObject({ ok: true, replayed: false });
    if (!result.ok) return;
    expect(result.orderNo).toMatch(/^SW-261002-[A-Z2-9]{4}$/);

    const order = await db.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: {
        lines: { orderBy: { nameSnapshot: "asc" } },
        payments: true,
        statusEvents: true,
      },
    });
    expect(order).toMatchObject({
      status: "confirmed",
      paymentStatus: "cod_pending",
      totalCents: total,
      subtotalCents: 2 * 11500 + 19500,
      deliveryFeeCents: 4900,
      contactPhone: "+639171234567",
      riderNotes: "Call when outside",
    });
    expect(order.addressSnapshot).toMatchObject({
      barangay: "Kapitolyo",
      city: "Pasig",
      landmark: expect.any(String),
    });
    expect(
      order.lines.map((l) => [l.nameSnapshot, l.orderedQty, l.lineTotalCents])
    ).toEqual([
      ["Magnolia Fresh Milk", 2, 23000],
      ["Pork Belly (Liempo)", 1, 19500],
    ]);
    expect(order.lines[1].orderedWeightGrams).toBe(500);
    expect(order.payments).toMatchObject([
      {
        method: "cod",
        status: "cod_pending",
        amountCents: total,
        provider: null,
      },
    ]);
    expect(order.statusEvents).toMatchObject([
      { from: null, to: "confirmed", actorType: "customer", actorId: ligaya },
    ]);
    expect(
      await db.job.findMany({ select: { kind: true, payload: true } })
    ).toEqual([
      { kind: ORDER_CONFIRMED_JOB, payload: { orderId: result.orderId } },
    ]);

    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(2);
    expect(
      await db.stockMovement.count({
        where: { orderId: result.orderId, reason: "reserve" },
      })
    ).toBe(2);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slots[0] } })).booked
    ).toBe(1);
    // The Cart is used up; the next add starts a new one.
    expect(
      (await getCart(owner(ligaya), { hubId: HUB, zone: null })).lines
    ).toEqual([]);
  });

  it("keeps the Customer's substitute choice and picker note on the Order Line", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    await db.cartLine.updateMany({
      where: { productId: MILK },
      data: {
        substitutionPreference: "preferred",
        preferredProductId: ALT_MILK,
        note: "Cold one please",
      },
    });
    const result = await placeOrder(await checkout(ligaya));
    const line = await db.orderLine.findFirstOrThrow({
      where: { orderId: result.ok ? result.orderId : "" },
    });
    expect(line).toMatchObject({
      substitutionPreference: "preferred",
      preferredProductId: ALT_MILK,
      note: "Cold one please",
    });
  });

  it("never rewrites an Order when the catalogue changes later", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    const result = await placeOrder(await checkout(ligaya));
    await db.product.update({
      where: { id: MILK },
      data: { priceCents: 99900, name: "Renamed Milk" },
    });
    const order = await getOrder(ligaya, result.ok ? result.orderNo : "");
    expect(order?.lines[0]).toMatchObject({
      name: "Magnolia Fresh Milk",
      unitPriceCents: 11500,
    });
    await db.product.update({
      where: { id: MILK },
      data: { name: "Fresh Milk" },
    });
  });

  it("stops when the total moved since the Customer looked", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    const input = await checkout(ligaya);
    await db.product.update({
      where: { id: MILK },
      data: { priceCents: 12500 },
    });
    expect(await placeOrder(input)).toEqual({
      ok: false,
      reason: "total_changed",
      totalCents: input.expectedTotalCents + 1000,
    });
    expect(await db.order.count()).toBe(0);
  });

  it("refuses an empty Cart, a Cart under the Zone minimum and someone else's address", async () => {
    expect(await placeOrder(await checkout(ligaya))).toMatchObject({
      ok: false,
      reason: "empty_cart",
    });
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    await db.zone.updateMany({ data: { minOrderCents: 50000 } });
    expect(await placeOrder(await checkout(ligaya))).toEqual({
      ok: false,
      reason: "below_minimum",
      shortByCents: 50000 - 11500,
    });
    await db.zone.updateMany({ data: { minOrderCents: 0 } });
    const paolosAddress = (await getDefaultAddress(paolo))!.id;
    expect(
      await placeOrder(await checkout(ligaya, { addressId: paolosAddress }))
    ).toMatchObject({
      ok: false,
      reason: "address_not_found",
    });
  });

  it("places one Order for a double-click, and answers both clicks with it", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    const input = await checkout(ligaya);
    const [a, b] = await Promise.all([placeOrder(input), placeOrder(input)]);
    expect(a.ok && b.ok && a.orderId === b.orderId).toBe(true);
    expect([a, b].filter((r) => r.ok && r.replayed)).toHaveLength(1);
    expect(await db.order.count()).toBe(1);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slots[0] } })).booked
    ).toBe(1);
  });

  it("places one Order when two tabs check out the same Cart", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    const results = await Promise.all([
      placeOrder(await checkout(ligaya)),
      placeOrder(await checkout(ligaya)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.order.count()).toBe(1);
  });
});

describe("two buyers at once", () => {
  it("sell the last unit once", async () => {
    await db.stockLevel.updateMany({
      where: { productId: MILK, hubId: HUB },
      data: { onHand: 1 },
    });
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    await setLineQuantity(owner(paolo), MILK, 1, HUB);
    const results = await Promise.all([
      placeOrder(await checkout(ligaya, { slotId: slots[0] })),
      placeOrder(await checkout(paolo, { slotId: slots[1] })),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({
      ok: false,
      reason: "out_of_stock",
      productIds: [MILK],
    });
    expect(await db.order.count()).toBe(1);
    const level = await db.stockLevel.findFirstOrThrow({
      where: { productId: MILK, hubId: HUB },
    });
    expect(level).toMatchObject({ onHand: 1, reserved: 1 });
    // The losing Order booked nothing.
    const booked = await db.slot.findMany({
      where: { id: { in: slots.slice(0, 2) } },
    });
    expect(booked.reduce((n, s) => n + s.booked, 0)).toBe(1);
  });

  it("take the last Slot place once", async () => {
    await db.slot.update({ where: { id: slots[0] }, data: { capacity: 1 } });
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    await setLineQuantity(owner(paolo), MILK, 1, HUB);
    const results = await Promise.all([
      placeOrder(await checkout(ligaya)),
      placeOrder(await checkout(paolo)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({
      ok: false,
      reason: "slot_unavailable",
    });
    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(1);
  });

  it("respect another cart's Slot hold", async () => {
    await db.slot.update({ where: { id: slots[0] }, data: { capacity: 1 } });
    await setLineQuantity(owner(paolo), MILK, 1, HUB);
    const paolosCart = await db.cart.findFirstOrThrow({
      where: { customerId: paolo },
    });
    await holdSlot(paolosCart.id, slots[0], NOW);
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    expect(await placeOrder(await checkout(ligaya))).toEqual({
      ok: false,
      reason: "slot_unavailable",
    });
    expect((await placeOrder(await checkout(paolo))).ok).toBe(true);
  });
});

describe("order status", () => {
  async function placed(customerId = ligaya) {
    await setLineQuantity(owner(customerId), MILK, 2, HUB);
    const result = await placeOrder(await checkout(customerId));
    if (!result.ok) throw new Error(result.reason);
    return result.orderId;
  }

  it("moves only along the lifecycle, recording who and why", async () => {
    const id = await placed();
    const staff = { type: "staff" as const, id: seedId("staff:picker") };
    expect(await transitionOrder(id, "delivered", staff)).toBe(false);
    expect(await transitionOrder(id, "picking", staff)).toBe(true);
    expect(await transitionOrder(id, "picking", staff)).toBe(false);
    expect(await transitionOrder(id, "picked", staff)).toBe(true);
    expect(
      await transitionOrder(id, "out_for_delivery", staff, "Rider Jun")
    ).toBe(true);
    expect(await transitionOrder(id, "delivered", staff)).toBe(true);
    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { statusEvents: { orderBy: { at: "asc" } } },
    });
    expect(order.deliveredAt).not.toBeNull();
    expect(order.statusEvents.map((e) => e.to)).toEqual([
      "confirmed",
      "picking",
      "picked",
      "out_for_delivery",
      "delivered",
    ]);
    expect(order.statusEvents[3]).toMatchObject({
      from: "picked",
      actorType: "staff",
      reason: "Rider Jun",
    });
  });

  it("lets the Customer cancel before picking, giving back stock and the Slot place", async () => {
    const id = await placed();
    expect(await cancelOrder(paolo, id)).toBe(false);
    expect(await cancelOrder(ligaya, id)).toBe(true);
    const order = await db.order.findUniqueOrThrow({ where: { id } });
    expect(order).toMatchObject({ status: "cancelled" });
    expect(order.cancelledAt).not.toBeNull();
    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(0);
    expect(
      await db.stockMovement.count({
        where: { orderId: id, reason: "release" },
      })
    ).toBe(1);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slots[0] } })).booked
    ).toBe(0);

    const second = await placed();
    await transitionOrder(second, "picking", {
      type: "staff",
      id: seedId("staff:picker"),
    });
    expect(await cancelOrder(ligaya, second)).toBe(false);
  });

  it("cancels online Orders left unpaid past the payment window", async () => {
    const id = await placed();
    await db.order.update({
      where: { id },
      data: { status: "pending_payment" },
    });
    const placedAt = (await db.order.findUniqueOrThrow({ where: { id } }))
      .placedAt;
    expect(
      await expireUnpaidOrders(new Date(placedAt.getTime() + 14 * 60_000))
    ).toBe(0);
    expect(
      await expireUnpaidOrders(new Date(placedAt.getTime() + 15 * 60_000))
    ).toBe(1);
    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { statusEvents: true },
    });
    expect(order.status).toBe("cancelled");
    expect(order.statusEvents.find((e) => e.to === "cancelled")).toMatchObject({
      actorType: "system",
      reason: "Payment not completed in time",
    });
    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(0);
  });

  it("lists the Customer's Orders, newest first, and finds one by number", async () => {
    const first = await placed();
    await setLineQuantity(owner(ligaya), LIEMPO, 1, HUB);
    const second = await placeOrder(
      await checkout(ligaya, {
        slotId: slots[1],
        now: new Date(NOW.getTime() + 60_000),
      })
    );
    const orders = await listOrders(ligaya);
    expect(orders.map((o) => o.id)).toEqual([
      second.ok ? second.orderId : "",
      first,
    ]);
    expect(await listOrders(paolo)).toEqual([]);
    const found = await getOrder(ligaya, orders[0].orderNo);
    expect(found).toMatchObject({
      status: "confirmed",
      paymentMethod: "cod",
      events: [{ to: "confirmed" }],
    });
    expect(await getOrder(paolo, orders[0].orderNo)).toBeNull();
  });
});
