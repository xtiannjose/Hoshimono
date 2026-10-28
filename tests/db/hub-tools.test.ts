import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { getCart, setLineQuantity } from "@/modules/cart";
import { getDefaultAddress, saveAddress } from "@/modules/customers";
import {
  closeSlots,
  getShopNotice,
  onlinePaused,
  resolveZone,
  setHubStatus,
} from "@/modules/delivery";
import { CRON_TICK, lastHeartbeat, recordHeartbeat } from "@/modules/jobs";
import {
  changeOrderAddress,
  completeDelivery,
  dispatchOrder,
  finishPicking,
  handOverOrder,
  moveOrderSlot,
  placeOrder,
  transitionOrder,
} from "@/modules/orders";
import {
  correctCashHandover,
  correctCollectedCash,
  recordCashHandover,
} from "@/modules/payments";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

// Staff changes to a placed Order and to the Hub when plans change
// (docs/runbook.md, "Things the app cannot do yet").
const db = createTestDb();
const HUB = seedId("hub:pasig");
const MILK = seedId("product:magnolia-fresh-milk");
const RIDER = seedId("staff:rider");
const dispatcher = { type: "staff" as const, id: seedId("staff:dispatcher") };

let ligaya: string;
let slots: { id: string; booked: number }[];

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db);
  ligaya = (
    await db.customer.findUniqueOrThrow({
      where: { email: "ligaya@example.com" },
    })
  ).id;
}, 60_000);
afterAll(() => db.$disconnect());

beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE cash_handovers, jobs, notifications, order_status_events, payments, stock_movements, order_lines, orders, slot_holds, cart_lines, carts CASCADE"
  );
  await db.slot.updateMany({ data: { booked: 0, capacity: 20 } });
  await db.stockLevel.updateMany({
    where: { productId: MILK },
    data: { onHand: 40, reserved: 0 },
  });
  await db.zone.updateMany({ data: { minOrderCents: 0 } });
  // Slots that still take Orders, past the cutoff.
  slots = await db.slot.findMany({
    where: {
      hubId: HUB,
      startsAt: { gt: new Date(Date.now() + 3 * 3_600_000) },
    },
    orderBy: { startsAt: "asc" },
    take: 3,
    select: { id: true, booked: true },
  });
});

/** Ligaya's 2 milk, cash on delivery, in the first Slot. */
async function placed() {
  const owner = { customerId: ligaya };
  await setLineQuantity(owner, MILK, 2, HUB);
  const address = (await getDefaultAddress(ligaya))!;
  const zone = (await resolveZone(address))!;
  const result = await placeOrder({
    customerId: ligaya,
    addressId: address.id,
    slotId: slots[0].id,
    contactPhone: "+639171234501",
    paymentMethod: "cod",
    expectedTotalCents: (await getCart(owner, { hubId: HUB, zone: zone.fees }))
      .priced.totalCents,
    idempotencyKey: randomUUID(),
  });
  if (!result.ok) throw new Error(result.reason);
  return result.orderId;
}

const booked = async (slotId: string) =>
  (await db.slot.findUniqueOrThrow({ where: { id: slotId } })).booked;

describe("moveOrderSlot", () => {
  it("moves the Order's place to another Slot that has room", async () => {
    const orderId = await placed();
    const moved = await moveOrderSlot(orderId, slots[1].id);
    expect(moved.ok).toBe(true);
    expect(await booked(slots[0].id)).toBe(0);
    expect(await booked(slots[1].id)).toBe(1);
    await db.slot.update({
      where: { id: slots[2].id },
      data: { capacity: 0 },
    });
    expect(await moveOrderSlot(orderId, slots[2].id)).toEqual({
      ok: false,
      reason: "slot_unavailable",
    });
  });

  it("leaves an Order already on its way alone", async () => {
    const orderId = await placed();
    await transitionOrder(orderId, "picking", dispatcher);
    await finishPicking(orderId, dispatcher);
    await dispatchOrder(orderId, RIDER, dispatcher);
    expect(await moveOrderSlot(orderId, slots[1].id)).toEqual({
      ok: false,
      reason: "not_movable",
    });
  });
});

describe("changeOrderAddress", () => {
  it("takes another saved address in the same Zone, not another Zone", async () => {
    const orderId = await placed();
    const office = await saveAddress(ligaya, {
      label: "Office",
      line1: "Unit 5, Ortigas Avenue",
      barangay: "San Antonio",
      city: "Pasig",
      landmark: "Lobby, ask the guard",
    });
    const condo = await saveAddress(ligaya, {
      label: "Condo",
      line1: "Unit 9, 5th Avenue",
      barangay: "Fort Bonifacio",
      city: "Taguig",
      landmark: "Tower 2",
    });
    if (!office.ok || !condo.ok) throw new Error("address");
    expect(await changeOrderAddress(orderId, office.address.id)).toEqual({
      ok: true,
    });
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: orderId } }))
        .addressSnapshot
    ).toMatchObject({ label: "Office", barangay: "San Antonio" });
    expect(await changeOrderAddress(orderId, condo.address.id)).toEqual({
      ok: false,
      reason: "other_zone",
    });
  });
});

describe("handOverOrder", () => {
  it("gives an Order on its way to another Rider and tells the Customer", async () => {
    const orderId = await placed();
    await transitionOrder(orderId, "picking", dispatcher);
    await finishPicking(orderId, dispatcher);
    expect(await handOverOrder(orderId, RIDER)).toEqual({
      ok: false,
      reason: "not_out",
    });
    await dispatchOrder(orderId, RIDER, dispatcher);
    const other = await db.staff.create({
      data: {
        email: `rider2-${randomUUID()}@hoshimono.test`,
        name: "Bong Reyes",
        role: "rider",
      },
    });
    expect(await handOverOrder(orderId, other.id)).toEqual({ ok: true });
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: orderId } })).riderId
    ).toBe(other.id);
    expect(
      await db.job.count({ where: { kind: "order.out_for_delivery" } })
    ).toBe(2);
  });
});

describe("cash corrections", () => {
  it("fixes an Order's cash before the count, and the count after", async () => {
    const orderId = await placed();
    await transitionOrder(orderId, "picking", dispatcher);
    await finishPicking(orderId, dispatcher);
    await dispatchOrder(orderId, RIDER, dispatcher);
    const { deliveryPin, finalTotalCents } = await db.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    await completeDelivery(orderId, RIDER, {
      pin: deliveryPin!,
      cashCents: finalTotalCents!,
    });
    expect(
      await correctCollectedCash(orderId, finalTotalCents! - 500, "")
    ).toMatchObject({ ok: false, errors: { note: expect.any(String) } });
    expect(
      await correctCollectedCash(
        orderId,
        finalTotalCents! - 500,
        "Rider typed it wrong"
      )
    ).toEqual({ ok: true });

    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
    }).format(new Date());
    await recordCashHandover(
      RIDER,
      day,
      finalTotalCents! - 500,
      dispatcher.id,
      ""
    );
    expect(
      await correctCollectedCash(orderId, finalTotalCents!, "Again")
    ).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
    expect(
      await correctCashHandover(
        RIDER,
        day,
        finalTotalCents! - 1000,
        dispatcher.id,
        "Found a ₱5 coin was a token"
      )
    ).toEqual({ ok: true });
    expect(
      await db.cashHandover.findFirstOrThrow({ where: { riderId: RIDER } })
    ).toMatchObject({ countedCents: finalTotalCents! - 1000 });
  });
});

describe("the Hub's status", () => {
  it("shows a notice until it ends, pauses online payment, and closes Slots", async () => {
    await setHubStatus(HUB, {
      notice: "Closed tomorrow for the typhoon",
      noticeUntil: new Date(Date.now() + 3_600_000),
      onlinePaused: true,
    });
    expect(await getShopNotice()).toBe("Closed tomorrow for the typhoon");
    expect(await getShopNotice(new Date(Date.now() + 7_200_000))).toBeNull();
    expect(await onlinePaused(HUB)).toBe(true);
    await setHubStatus(HUB, {
      notice: null,
      noticeUntil: null,
      onlinePaused: false,
    });

    const orderId = await placed();
    expect(orderId).toBeTruthy();
    const closed = await closeSlots(
      HUB,
      new Date(),
      new Date(Date.now() + 7 * 24 * 3_600_000)
    );
    expect(closed).toBeGreaterThan(0);
    const open = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM slots WHERE capacity > booked AND starts_at > now()`;
    expect(open[0].n).toBe(0);
    expect(await booked(slots[0].id)).toBe(1); // the booked Order keeps its place
  });

  it("remembers when the cron last ticked", async () => {
    const at = new Date("2026-10-28T05:00:00Z");
    await recordHeartbeat(CRON_TICK, at);
    expect(await lastHeartbeat(CRON_TICK)).toEqual(at);
  });
});
