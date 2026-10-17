import { randomUUID } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, resetDb } from "./helpers";

// docs/04-DATA-MODEL.md section 4: invariants the database itself must enforce.
const db = createTestDb();

beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

async function hub() {
  return db.hub.create({
    data: { name: "Test Hub", address: "Pasig", lat: 14.58, lng: 121.08 },
  });
}

async function product(name = "Gala Apples, 4 pack") {
  const category = await db.category.create({
    data: { slug: `cat-${randomUUID()}`, name: "Fruit" },
  });
  return db.product.create({
    data: {
      slug: `p-${randomUUID()}`,
      name,
      categoryId: category.id,
      packSizeValue: 4,
      packSizeUnit: "pc",
      unitPriceBasis: "per_piece",
      priceCents: 16500,
      taxClass: "vat_exempt",
      status: "active",
    },
  });
}

async function slot(hubId: string, capacity = 2) {
  const startsAt = new Date("2026-10-19T06:00:00Z");
  return db.slot.create({
    data: {
      hubId,
      date: new Date("2026-10-19"),
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 3_600_000),
      capacity,
    },
  });
}

async function customer() {
  return db.customer.create({ data: { name: "Ligaya Dimaculangan" } });
}

async function orderData(overrides: Record<string, unknown> = {}) {
  const h = await hub();
  const s = await slot(h.id);
  const c = await customer();
  return {
    orderNo: `SW-261019-${randomUUID().slice(0, 4)}`,
    customerId: c.id,
    hubId: h.id,
    slotId: s.id,
    status: "confirmed" as const,
    paymentStatus: "cod_pending" as const,
    addressSnapshot: { line1: "12 Sampaguita Street" },
    contactPhone: "+639171234501",
    subtotalCents: 100000,
    discountCents: 5000,
    deliveryFeeCents: 4900,
    vatCents: 0,
    totalCents: 99900,
    idempotencyKey: randomUUID(),
    ...overrides,
  };
}

describe("database invariants", () => {
  it("1. stock: reserved never exceeds on hand and neither goes negative", async () => {
    const h = await hub();
    const p = await product();
    const key = { productId: p.id, hubId: h.id };
    await db.stockLevel.create({ data: { ...key, onHand: 5, reserved: 5 } });

    await expect(
      db.stockLevel.update({
        where: { productId_hubId: key },
        data: { reserved: 6 },
      })
    ).rejects.toThrow(/stock_levels_quantities_check/);
    await expect(
      db.stockLevel.update({
        where: { productId_hubId: key },
        data: { onHand: -1, reserved: 0 },
      })
    ).rejects.toThrow(/stock_levels_quantities_check/);
  });

  it("2. a Slot cannot be booked past capacity", async () => {
    const s = await slot((await hub()).id, 2);
    await db.slot.update({ where: { id: s.id }, data: { booked: 2 } });
    await expect(
      db.slot.update({ where: { id: s.id }, data: { booked: 3 } })
    ).rejects.toThrow(/slots_capacity_check/);
  });

  it("3. the same provider event cannot be recorded twice", async () => {
    const event = {
      provider: "xendit",
      providerEventId: "evt_123",
      type: "payment.succeeded",
      payload: {},
    };
    await db.paymentEvent.create({ data: event });
    await expect(db.paymentEvent.create({ data: event })).rejects.toThrow();
    // The same id from another provider is a different event.
    await db.paymentEvent.create({ data: { ...event, provider: "paymongo" } });
    expect(await db.paymentEvent.count()).toBe(2);
  });

  it("4. an idempotency key places at most one Order", async () => {
    const data = await orderData();
    await db.order.create({ data });
    await expect(
      db.order.create({
        data: { ...data, orderNo: "SW-261019-ZZZZ" },
      })
    ).rejects.toThrow();
    expect(await db.order.count()).toBe(1);
  });

  it("5. Order total equals subtotal minus discount plus delivery fee", async () => {
    await expect(
      db.order.create({ data: await orderData({ totalCents: 100000 }) })
    ).rejects.toThrow(/orders_total_check/);
    // VAT is included in prices and must not be added again.
    await expect(
      db.order.create({
        data: await orderData({ vatCents: 10714, totalCents: 99900 + 10714 }),
      })
    ).rejects.toThrow(/orders_total_check/);
  });

  it("8. a Product has at most one primary image", async () => {
    const p = await product();
    const image = { productId: p.id, url: "/a.webp", alt: "Gala Apples" };
    await db.productImage.create({ data: { ...image, isPrimary: true } });
    await db.productImage.create({ data: { ...image, url: "/b.webp" } });
    await expect(
      db.productImage.create({
        data: { ...image, url: "/c.webp", isPrimary: true },
      })
    ).rejects.toThrow();
  });

  it("9. a Customer has at most one open Cart", async () => {
    const c = await customer();
    const first = await db.cart.create({ data: { customerId: c.id } });
    await expect(
      db.cart.create({ data: { customerId: c.id } })
    ).rejects.toThrow();

    // After Checkout the old Cart is closed and a new one may open.
    await db.cart.update({
      where: { id: first.id },
      data: { checkedOutAt: new Date() },
    });
    await db.cart.create({ data: { customerId: c.id } });
    expect(await db.cart.count()).toBe(2);
  });

  it("search vector ignores accents", async () => {
    const p = await product("Jalapeño Peppers");
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE search_vector @@ to_tsquery('simple', immutable_unaccent('jalapeno'))`;
    expect(rows.map((r) => r.id)).toEqual([p.id]);
  });
});
