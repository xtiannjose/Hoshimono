import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { addMinutes } from "@/lib/dates";
import {
  getCart,
  setLineNote,
  setLineQuantity,
  setSubstitution,
  type CartOwner,
} from "@/modules/cart";
import { getDefaultAddress } from "@/modules/customers";
import { holdSlot, resolveZone } from "@/modules/delivery";
import { jobHandlers } from "@/server/job-handlers";
import {
  abandonPayment,
  addOrderNote,
  answerSubstitution,
  cancelOrder,
  confirmPaidOrder,
  expireUnpaidOrders,
  finishPicking,
  getPickList,
  getOrder,
  getOrderForStaff,
  listOrders,
  listOrdersForStaff,
  MAX_COD_TOTAL_CENTS,
  MAX_OPEN_COD_ORDERS,
  ORDER_CONFIRMED_JOB,
  placeOrder,
  proposeSubstitution,
  recordPick,
  staffMoves,
  SUBSTITUTION_ASKED_JOB,
  transitionOrder,
  type PlaceOrderInput,
} from "@/modules/orders";
import { startCheckout, type PaymentProvider } from "@/modules/payments";

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
    "TRUNCATE rate_limits, jobs, notifications, order_status_events, payments, stock_movements, order_lines, orders, slot_holds, cart_lines, carts CASCADE"
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
    const a = await checkout(ligaya);
    const b = await checkout(ligaya);
    const results = await Promise.all([placeOrder(a), placeOrder(b)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toEqual({
      ok: false,
      reason: "already_placed",
    });
    expect(await db.order.count()).toBe(1);
  });
});

describe("placeOrder refusals", () => {
  it("never answers with another Customer's Order for a reused key", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    const placed = await placeOrder(await checkout(ligaya));
    await setLineQuantity(owner(paolo), MILK, 1, HUB);
    const key = (await db.order.findFirstOrThrow()).idempotencyKey;
    expect(
      await placeOrder(await checkout(paolo, { idempotencyKey: key }))
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(placed.ok).toBe(true);
    expect(await db.order.count()).toBe(1);
  });

  it("asks for a real mobile number and an address we deliver to", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    expect(
      await placeOrder(await checkout(ligaya, { contactPhone: "02 8123 4567" }))
    ).toEqual({
      ok: false,
      reason: "invalid_phone",
    });
    const address = (await getDefaultAddress(ligaya))!;
    const input = await checkout(ligaya);
    await db.address.update({
      where: { id: address.id },
      data: { city: "Cebu City" },
    });
    expect(await placeOrder(input)).toEqual({
      ok: false,
      reason: "out_of_zone",
    });
    await db.address.update({
      where: { id: address.id },
      data: { city: "Pasig" },
    });
  });

  it("leaves a sold-out line out of the Order, as the Cart showed", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    await setLineQuantity(owner(ligaya), LIEMPO, 1, HUB);
    await db.stockLevel.updateMany({
      where: { productId: LIEMPO },
      data: { onHand: 0 },
    });
    const result = await placeOrder(await checkout(ligaya));
    const lines = await db.orderLine.findMany({
      where: { orderId: result.ok ? result.orderId : "" },
    });
    expect(lines.map((l) => l.productId)).toEqual([MILK]);
  });

  it("says nothing is in stock rather than that the Cart is empty", async () => {
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    await db.stockLevel.updateMany({
      where: { productId: MILK },
      data: { onHand: 0 },
    });
    expect(await placeOrder(await checkout(ligaya))).toEqual({
      ok: false,
      reason: "nothing_in_stock",
    });
  });

  it("refuses a Slot from another Hub", async () => {
    const other = await db.hub.create({
      data: { name: "Makati Hub", address: "Makati", lat: 14.55, lng: 121.02 },
    });
    const foreign = await db.slot.create({
      data: {
        hubId: other.id,
        date: new Date("2026-10-02"),
        startsAt: new Date(NOW.getTime() + 5 * 3_600_000),
        endsAt: new Date(NOW.getTime() + 7 * 3_600_000),
        capacity: 5,
      },
    });
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    expect(
      await placeOrder(await checkout(ligaya, { slotId: foreign.id }))
    ).toEqual({
      ok: false,
      reason: "slot_unavailable",
    });
    await db.slot.delete({ where: { id: foreign.id } });
    await db.hub.delete({ where: { id: other.id } });
  });
});

describe("cash on delivery limits", () => {
  it(`refuses more than ${MAX_OPEN_COD_ORDERS} open COD Orders per Customer`, async () => {
    for (let i = 0; i < MAX_OPEN_COD_ORDERS; i++) {
      await setLineQuantity(owner(ligaya), MILK, 1, HUB);
      expect((await placeOrder(await checkout(ligaya))).ok).toBe(true);
    }
    await setLineQuantity(owner(ligaya), MILK, 1, HUB);
    expect(await placeOrder(await checkout(ligaya))).toEqual({
      ok: false,
      reason: "too_many_open_orders",
    });
    // A delivered or cancelled Order frees a place.
    const first = await db.order.findFirstOrThrow({
      orderBy: { placedAt: "asc" },
    });
    await cancelOrder(ligaya, first.id);
    expect((await placeOrder(await checkout(ligaya))).ok).toBe(true);
  });

  it("refuses a COD Order above the cash limit", async () => {
    await db.stockLevel.updateMany({
      where: { productId: { in: [MILK, LIEMPO] } },
      data: { onHand: 200 },
    });
    await setLineQuantity(owner(ligaya), MILK, 99, HUB);
    await setLineQuantity(owner(ligaya), LIEMPO, 99, HUB);
    expect(await placeOrder(await checkout(ligaya))).toEqual({
      ok: false,
      reason: "over_cod_limit",
      limitCents: MAX_COD_TOTAL_CENTS,
    });
  });
});

describe("online payment", () => {
  it("holds stock and the Slot while the Customer pays, without confirming yet", async () => {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    const result = await placeOrder(
      await checkout(ligaya, { paymentMethod: "gcash" })
    );
    if (!result.ok) throw new Error(result.reason);

    const order = await db.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { payments: true, statusEvents: true },
    });
    expect(order).toMatchObject({
      status: "pending_payment",
      paymentStatus: "unpaid",
    });
    expect(order.payments).toEqual([
      expect.objectContaining({
        method: "gcash",
        provider: "paymongo",
        providerRef: null,
        amountCents: order.totalCents,
        status: "unpaid",
      }),
    ]);
    expect(order.statusEvents.map((e) => e.to)).toEqual(["pending_payment"]);
    // The confirmation goes out once PayMongo says paid, not now.
    expect(await db.job.count()).toBe(0);
    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(2);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slots[0] } })).booked
    ).toBe(1);
  });
});

describe("payment window", () => {
  /** A provider that answers every expiry with `answer` and records it. */
  function fakeProvider(answer: "expired" | "refused" = "expired") {
    const expired: string[] = [];
    const provider: PaymentProvider = {
      name: "paymongo",
      createCheckout: async () => ({
        providerRef: "cs_after",
        redirectUrl: "https://pay.test/cs_after",
      }),
      expireCheckout: async (ref) => {
        expired.push(ref);
        return answer;
      },
      capture: async () => {},
      refund: async () => ({ ok: true, refundRef: "ref_unused" }),
      verifyWebhook: () => false,
      parseEvent: () => {
        throw new Error("not used here");
      },
    };
    return Object.assign(provider, { expired });
  }

  /** A GCash Order waiting for payment, with a Checkout Session or none yet. */
  async function waiting(sessionId: string | null) {
    const result = await placeOrder(
      await checkout(ligaya, { paymentMethod: "gcash" })
    );
    if (!result.ok) throw new Error(result.reason);
    if (sessionId) {
      await db.payment.updateMany({
        where: { orderId: result.orderId },
        data: {
          providerRef: sessionId,
          checkoutUrl: `https://pay.test/${sessionId}`,
        },
      });
    }
    return result.orderId;
  }

  const reserved = async (productId: string) =>
    (
      await db.stockLevel.findFirstOrThrow({
        where: { productId, hubId: HUB },
      })
    ).reserved;

  it("cancels an Order still unpaid after 15 minutes and puts its lines back in the Cart", async () => {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    await setSubstitution(owner(ligaya), MILK, {
      preference: "preferred",
      preferredProductId: ALT_MILK,
    });
    await setLineNote(owner(ligaya), MILK, "Coldest one please");
    await setLineQuantity(owner(ligaya), LIEMPO, 1, HUB);
    const id = await waiting("cs_window");
    // Shopping again meanwhile: a line already in the new Cart stays as set.
    await setLineQuantity(owner(ligaya), LIEMPO, 3, HUB);
    const paymongo = fakeProvider();

    expect(await expireUnpaidOrders(paymongo, addMinutes(NOW, 14))).toBe(0);
    expect(paymongo.expired).toEqual([]);
    expect(await expireUnpaidOrders(paymongo, addMinutes(NOW, 16))).toBe(1);
    expect(await expireUnpaidOrders(paymongo, addMinutes(NOW, 17))).toBe(0);

    expect(paymongo.expired).toEqual(["cs_window"]);
    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { payments: true, statusEvents: { orderBy: { at: "asc" } } },
    });
    expect(order).toMatchObject({
      status: "cancelled",
      paymentStatus: "failed",
    });
    expect(order.payments.map((p) => p.status)).toEqual(["failed"]);
    expect(order.statusEvents.at(-1)).toMatchObject({
      from: "pending_payment",
      to: "cancelled",
      actorType: "system",
    });
    expect(await reserved(MILK)).toBe(0);
    // The new Cart's 3 are not reserved; the Order's 1 went back.
    expect(await reserved(LIEMPO)).toBe(0);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slots[0] } })).booked
    ).toBe(0);

    const lines = await db.cartLine.findMany({
      where: { cart: { customerId: ligaya, checkedOutAt: null } },
    });
    expect(lines).toHaveLength(2);
    expect(lines.find((l) => l.productId === MILK)).toMatchObject({
      quantity: 2,
      substitutionPreference: "preferred",
      preferredProductId: ALT_MILK,
      note: "Coldest one please",
    });
    expect(lines.find((l) => l.productId === LIEMPO)).toMatchObject({
      quantity: 3,
    });
  });

  it("leaves an Order PayMongo will not expire: its payment is going through", async () => {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    const id = await waiting("cs_busy");
    const paymongo = fakeProvider("refused");

    expect(await expireUnpaidOrders(paymongo, addMinutes(NOW, 16))).toBe(0);

    expect(paymongo.expired).toEqual(["cs_busy"]);
    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { payments: true },
    });
    expect(order).toMatchObject({
      status: "pending_payment",
      paymentStatus: "unpaid",
    });
    expect(order.payments.map((p) => p.status)).toEqual(["unpaid"]);
    expect(await reserved(MILK)).toBe(2);
    expect(
      await db.cartLine.count({
        where: { cart: { customerId: ligaya, checkedOutAt: null } },
      })
    ).toBe(0);
  });

  it("cancels an Order that never reached PayMongo, and no checkout opens for it after", async () => {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    const id = await waiting(null);
    const paymongo = fakeProvider();

    expect(await expireUnpaidOrders(paymongo, addMinutes(NOW, 16))).toBe(1);

    expect(paymongo.expired).toEqual([]);
    expect((await db.order.findUniqueOrThrow({ where: { id } })).status).toBe(
      "cancelled"
    );
    expect(
      await startCheckout(paymongo, {
        orderId: id,
        orderNo: "SW-LATE",
        successUrl: "https://hoshimono.test/ok",
        cancelUrl: "https://hoshimono.test/back",
      })
    ).toBeNull();
  });
});

describe("giving up on paying", () => {
  it("cancels the Customer's own unpaid Order and puts its lines back in the Cart", async () => {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    const placed = await placeOrder(
      await checkout(ligaya, { paymentMethod: "card" })
    );
    if (!placed.ok) throw new Error(placed.reason);
    await db.payment.updateMany({
      where: { orderId: placed.orderId },
      data: { providerRef: "cs_back" },
    });
    const expired: string[] = [];
    const provider = {
      name: "paymongo",
      expireCheckout: async (ref: string) => {
        expired.push(ref);
        return "expired" as const;
      },
    } as unknown as PaymentProvider;

    // Plain cancel would leave the checkout open to take money.
    expect(await cancelOrder(ligaya, placed.orderId)).toBe(false);
    expect(await abandonPayment(provider, paolo, placed.orderId)).toBe(false);
    expect(expired).toEqual([]);
    expect(await abandonPayment(provider, ligaya, placed.orderId)).toBe(true);

    expect(expired).toEqual(["cs_back"]);
    const order = await db.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      include: { statusEvents: { orderBy: { at: "asc" } } },
    });
    expect(order.status).toBe("cancelled");
    expect(order.statusEvents.at(-1)).toMatchObject({
      actorType: "customer",
      actorId: ligaya,
    });
    expect(
      await db.cartLine.findMany({
        where: { cart: { customerId: ligaya, checkedOutAt: null } },
      })
    ).toEqual([expect.objectContaining({ productId: MILK, quantity: 2 })]);
  });
});

describe("final total and refunds", () => {
  const staff = { type: "staff" as const, id: seedId("staff:picker") };

  /** Milk x2 and a 500 g pack of liempo, placed and paid (or COD). */
  async function placed(paymentMethod: "gcash" | "cod") {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    await setLineQuantity(owner(ligaya), LIEMPO, 1, HUB);
    const result = await placeOrder(await checkout(ligaya, { paymentMethod }));
    if (!result.ok) throw new Error(result.reason);
    if (paymentMethod === "gcash") {
      const { totalCents } = await db.order.findUniqueOrThrow({
        where: { id: result.orderId },
      });
      await db.payment.updateMany({
        where: { orderId: result.orderId },
        data: {
          status: "paid",
          capturedCents: totalCents,
          paymentRef: "pay_1",
        },
      });
      await db.$transaction((tx) =>
        confirmPaidOrder(tx, { orderId: result.orderId })
      );
    }
    return result.orderId;
  }

  /** The Picker's entries: one milk short, the liempo 450 g of 500 g. */
  async function pick(orderId: string) {
    await db.orderLine.updateMany({
      where: { orderId, productId: MILK },
      data: { fulfilledQty: 1 },
    });
    await db.orderLine.updateMany({
      where: { orderId, productId: LIEMPO },
      data: { finalWeightGrams: 450 },
    });
    await transitionOrder(orderId, "picking", staff);
    expect(await transitionOrder(orderId, "picked", staff)).toBe(true);
  }

  it("refunds the whole payment when a paid Order is cancelled", async () => {
    const id = await placed("gcash");

    expect(await cancelOrder(ligaya, id)).toBe(true);

    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { payments: { include: { refunds: true } } },
    });
    expect(order).toMatchObject({
      status: "cancelled",
      paymentStatus: "refunded",
    });
    expect(order.payments[0]).toMatchObject({
      status: "refunded",
      refundedCents: order.totalCents,
    });
    expect(order.payments[0].refunds).toEqual([
      expect.objectContaining({
        reason: "cancelled",
        amountCents: order.totalCents,
        status: "pending",
      }),
    ]);
  });

  it("charges what was packed once picked, refunding the difference in one go", async () => {
    const id = await placed("gcash");

    await pick(id);

    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { payments: { include: { refunds: true } } },
    });
    // Estimate: 2 x 115.00 + 195.00 + 49.00 delivery = 474.00.
    // Packed: 1 x 115.00 + 195.00 x 450/500 + 49.00 = 339.50.
    expect(order.totalCents).toBe(47400);
    expect(order).toMatchObject({
      finalTotalCents: 33950,
      paymentStatus: "partially_refunded",
    });
    expect(order.payments[0].refunds).toEqual([
      expect.objectContaining({ reason: "picked", amountCents: 13450 }),
    ]);
  });

  it("sets the cash to collect for a COD Order, with nothing to refund", async () => {
    const id = await placed("cod");

    await pick(id);

    const order = await db.order.findUniqueOrThrow({ where: { id } });
    expect(order).toMatchObject({
      finalTotalCents: 33950,
      paymentStatus: "cod_pending",
    });
    expect(await db.refund.count()).toBe(0);
  });
});

describe("the staff order queue", () => {
  const dispatcher = seedId("staff:dispatcher");

  async function placed(customerId: string, slot = slots[0]) {
    await setLineQuantity(owner(customerId), MILK, 1, HUB);
    const result = await placeOrder(
      await checkout(customerId, { slotId: slot })
    );
    if (!result.ok) throw new Error(result.reason);
    return result;
  }

  it("lists Orders by Slot time, filtered by status and found by number, phone or name", async () => {
    const late = await placed(ligaya, slots[1]);
    const early = await placed(paolo, slots[0]);
    await transitionOrder(late.orderId, "picking", {
      type: "staff",
      id: dispatcher,
    });

    const all = await listOrdersForStaff({});
    expect(all.map((o) => o.orderNo)).toEqual([early.orderNo, late.orderNo]);
    expect(all[0]).toMatchObject({
      customerName: "Paolo Villanueva",
      status: "confirmed",
      paymentMethod: "cod",
    });

    const picking = await listOrdersForStaff({ status: "picking" });
    expect(picking.map((o) => o.orderNo)).toEqual([late.orderNo]);
    for (const q of [late.orderNo.slice(-4), "ligaya", "Dimaculangan"]) {
      expect(
        (await listOrdersForStaff({ q })).map((o) => o.orderNo),
        q
      ).toEqual([late.orderNo]);
    }
    // The contact number as typed, in any of its forms.
    expect(
      (await listOrdersForStaff({ q: "0917 123 4567" })).length
    ).toBeGreaterThan(0);
  });

  it("keeps staff notes on an Order, with who wrote them", async () => {
    const { orderId, orderNo } = await placed(ligaya);

    expect(await addOrderNote(orderId, dispatcher, "   ")).toEqual({
      ok: false,
      errors: { text: "Write a note first." },
    });
    expect(await addOrderNote(orderId, dispatcher, "Gate code 4421")).toEqual({
      ok: true,
    });
    await addOrderNote(orderId, dispatcher, "Customer asked for 3 PM");

    const order = await getOrderForStaff(orderNo);
    expect(order?.notes).toEqual([
      expect.objectContaining({
        text: "Gate code 4421",
        staffName: "Marites Aquino",
      }),
      expect.objectContaining({ text: "Customer asked for 3 PM" }),
    ]);
  });

  it("shows the whole history with who moved the Order and why", async () => {
    const { orderId, orderNo } = await placed(ligaya);
    await transitionOrder(
      orderId,
      "cancelled",
      { type: "staff", id: dispatcher },
      "Customer called to cancel"
    );

    const order = await getOrderForStaff(orderNo);
    expect(order).toMatchObject({
      status: "cancelled",
      customer: { name: "Ligaya Dimaculangan", email: "ligaya@example.com" },
    });
    expect(order?.history.at(-1)).toMatchObject({
      from: "confirmed",
      to: "cancelled",
      actor: "Marites Aquino",
      reason: "Customer called to cancel",
    });
    expect(order?.history[0]).toMatchObject({
      to: "confirmed",
      actor: "Customer",
    });
    expect(await getOrderForStaff("SW-000000-XXXX")).toBeNull();
  });

  it("offers staff only the moves the lifecycle allows", () => {
    // Unpaid online Orders are settled by the webhook or the Payment Window.
    expect(staffMoves("pending_payment")).toEqual([]);
    expect(staffMoves("confirmed")).toEqual(["picking", "cancelled"]);
    expect(staffMoves("out_for_delivery")).toEqual([
      "delivered",
      "delivery_failed",
    ]);
    expect(staffMoves("delivered")).toEqual([]);
  });
});

describe("picking and Substitutions (ADR 0010)", () => {
  const picker = seedId("staff:picker");
  const asPicker = { type: "staff" as const, id: picker };

  /** Liempo (weighed) and 2 milk, placed and picking; milk set as given. */
  async function picking(
    milk: {
      preference: "allow" | "preferred" | "none";
      preferredProductId?: string;
    } = {
      preference: "allow",
    }
  ) {
    await setLineQuantity(owner(ligaya), MILK, 2, HUB);
    await setLineQuantity(owner(ligaya), LIEMPO, 1, HUB);
    await setSubstitution(owner(ligaya), MILK, {
      preference: milk.preference,
      preferredProductId: milk.preferredProductId ?? null,
    });
    const placed = await placeOrder(await checkout(ligaya));
    if (!placed.ok) throw new Error(placed.reason);
    await transitionOrder(placed.orderId, "picking", asPicker);
    const list = await getPickList(placed.orderNo);
    const line = (id: string) => list!.lines.find((l) => l.productId === id)!;
    return { ...placed, milk: line(MILK), liempo: line(LIEMPO) };
  }

  it("lists the lines in Category order with what the Customer asked", async () => {
    const order = await picking({
      preference: "preferred",
      preferredProductId: ALT_MILK,
    });
    const list = await getPickList(order.orderNo);
    // Meat and fish comes before Dairy and eggs in the Category tree.
    expect(list!.lines.map((l) => l.productId)).toEqual([LIEMPO, MILK]);
    expect(order.milk).toMatchObject({
      orderedQty: 2,
      weighed: false,
      preference: "preferred",
      preferred: { id: ALT_MILK },
    });
    expect(order.liempo).toMatchObject({
      weighed: true,
      orderedWeightGrams: 500,
    });
  });

  it("records what was found, and keeps a weighed pack within 10% over", async () => {
    const order = await picking();
    expect(await recordPick(order.milk.id, { found: 3 })).toEqual({
      ok: false,
      errors: { found: "Enter 0 to 2." },
    });
    expect(await recordPick(order.milk.id, { found: 1 })).toEqual({ ok: true });
    expect(await recordPick(order.liempo.id, { grams: 560 })).toEqual({
      ok: false,
      errors: { grams: "More than 10% over: repack to about 500 g." },
    });
    expect(await recordPick(order.liempo.id, { grams: 540 })).toEqual({
      ok: true,
    });

    const list = await getPickList(order.orderNo);
    expect(list!.lines.find((l) => l.id === order.milk.id)).toMatchObject({
      fulfilledQty: 1,
      status: "short",
    });
    expect(list!.lines.find((l) => l.id === order.liempo.id)).toMatchObject({
      finalWeightGrams: 540,
      status: "picked",
    });
  });

  it("asks before a similar-item swap; a refusal leaves the line unpaid", async () => {
    const order = await picking({ preference: "allow" });
    const now = new Date();
    const result = await proposeSubstitution(
      order.milk.id,
      picker,
      ALT_MILK,
      now
    );
    expect(result).toMatchObject({ ok: true, asked: true });
    const sub = await db.substitution.findFirstOrThrow({
      where: { orderLineId: order.milk.id },
    });
    expect(sub).toMatchObject({ quantity: 2, customerResponse: null });
    expect(sub.windowEndsAt!.getTime() - now.getTime()).toBe(10 * 60_000);
    expect(
      await db.job.count({ where: { kind: SUBSTITUTION_ASKED_JOB } })
    ).toBe(1);

    // Still open: the Order cannot be finished yet.
    expect(await finishPicking(order.orderId, asPicker, now)).toMatchObject({
      ok: false,
      reason: "waiting_for_customer",
    });
    expect(await answerSubstitution(sub.token!, false, now)).toBe("refused");
    expect(await answerSubstitution("not-a-token", true, now)).toBeNull();

    await recordPick(order.liempo.id, { grams: 500 });
    expect(await finishPicking(order.orderId, asPicker, now)).toEqual({
      ok: true,
    });
    const done = await db.order.findUniqueOrThrow({
      where: { id: order.orderId },
    });
    // 195.00 liempo + 49.00 delivery; the refused milk is not charged.
    expect(done).toMatchObject({ status: "picked", finalTotalCents: 24400 });
  });

  it("swaps in the Customer's own choice without asking, at the lower price", async () => {
    const order = await picking({
      preference: "preferred",
      preferredProductId: ALT_MILK,
    });
    expect(
      await proposeSubstitution(
        order.milk.id,
        picker,
        seedId("product:alaska-full-cream-milk")
      )
    ).toEqual({ ok: false, reason: "not_their_choice" });
    expect(
      await proposeSubstitution(order.milk.id, picker, ALT_MILK)
    ).toMatchObject({
      ok: true,
      asked: false,
    });
    expect(
      await db.substitution.findFirstOrThrow({
        where: { orderLineId: order.milk.id },
      })
    ).toMatchObject({ customerResponse: "auto_accepted", token: null });

    await recordPick(order.liempo.id, { grams: 500 });
    expect(await finishPicking(order.orderId, asPicker)).toEqual({ ok: true });
    const { priceCents: alt } = await db.product.findUniqueOrThrow({
      where: { id: ALT_MILK },
    });
    const done = await db.order.findUniqueOrThrow({
      where: { id: order.orderId },
    });
    expect(done.finalTotalCents).toBe(19500 + 2 * Math.min(alt, 11500) + 4900);
  });

  it("never swaps a no-substitute line or a weighed one", async () => {
    const order = await picking({ preference: "none" });
    expect(await proposeSubstitution(order.milk.id, picker, ALT_MILK)).toEqual({
      ok: false,
      reason: "no_substitute",
    });
    expect(
      await proposeSubstitution(
        order.liempo.id,
        picker,
        seedId("product:pork-kasim")
      )
    ).toEqual({ ok: false, reason: "weighed" });
  });

  it("takes silence as a yes once the window ends", async () => {
    const order = await picking({ preference: "allow" });
    const now = new Date();
    await proposeSubstitution(order.milk.id, picker, ALT_MILK, now);
    const later = addMinutes(now, 11);
    const sub = await db.substitution.findFirstOrThrow({
      where: { orderLineId: order.milk.id },
    });
    expect(await answerSubstitution(sub.token!, false, later)).toBe("too_late");

    await recordPick(order.liempo.id, { grams: 500 });
    expect(await finishPicking(order.orderId, asPicker, later)).toEqual({
      ok: true,
    });
    expect(
      await db.substitution.findUniqueOrThrow({ where: { id: sub.id } })
    ).toMatchObject({ customerResponse: "auto_accepted" });
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
    const a = await checkout(ligaya, { slotId: slots[0] });
    const b = await checkout(paolo, { slotId: slots[1] });
    const results = await Promise.all([placeOrder(a), placeOrder(b)]);
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
    const a = await checkout(ligaya);
    const b = await checkout(paolo);
    const results = await Promise.all([placeOrder(a), placeOrder(b)]);
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
    await holdSlot(paolosCart.id, slots[0], { hubId: HUB, now: NOW });
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

  it("voids the COD payment when an Order is cancelled", async () => {
    const id = await placed();
    await cancelOrder(ligaya, id);
    const order = await db.order.findUniqueOrThrow({
      where: { id },
      include: { payments: true },
    });
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.payments.map((p) => p.status)).toEqual(["unpaid"]);
  });

  it("gives back exactly this Order's stock and Slot place when staff cancel during picking", async () => {
    const id = await placed();
    // Another Order's reservation and booking must stay.
    await db.stockLevel.updateMany({
      where: { productId: MILK, hubId: HUB },
      data: { reserved: { increment: 5 } },
    });
    await db.slot.update({
      where: { id: slots[0] },
      data: { booked: { increment: 3 } },
    });
    const staff = { type: "staff" as const, id: seedId("staff:picker") };
    await transitionOrder(id, "picking", staff);
    expect(await transitionOrder(id, "cancelled", staff, "Damaged stock")).toBe(
      true
    );
    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(5);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slots[0] } })).booked
    ).toBe(3);
    // Cancelling again releases nothing more.
    expect(await transitionOrder(id, "cancelled", staff)).toBe(false);
    expect(
      (
        await db.stockLevel.findFirstOrThrow({
          where: { productId: MILK, hubId: HUB },
        })
      ).reserved
    ).toBe(5);
  });

  it("follows the other lifecycle edges: paid, failed delivery and retry", async () => {
    const id = await placed();
    await db.order.update({
      where: { id },
      data: { status: "pending_payment" },
    });
    const system = { type: "system" as const };
    const staff = { type: "staff" as const, id: seedId("staff:dispatcher") };
    expect(await transitionOrder(id, "confirmed", system, "Paid")).toBe(true);
    for (const to of [
      "picking",
      "picked",
      "out_for_delivery",
      "delivery_failed",
      "out_for_delivery",
      "delivered",
    ] as const) {
      expect(await transitionOrder(id, to, staff), to).toBe(true);
    }
    expect(await transitionOrder(id, "cancelled", staff)).toBe(false);
  });

  it("sends no confirmed notice for an Order cancelled before the job ran", async () => {
    const id = await placed();
    await cancelOrder(ligaya, id);
    await jobHandlers[ORDER_CONFIRMED_JOB]({ orderId: id });
    expect(await db.notification.count({ where: { orderId: id } })).toBe(0);
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
