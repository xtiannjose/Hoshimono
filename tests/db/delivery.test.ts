import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db as appDb } from "@/lib/db";
import {
  bookSlot,
  getSlotHold,
  holdSlot,
  listServiceAreas,
  listSlots,
  purgeExpiredHolds,
  releaseSlot,
  resolveZone,
  SLOT_CUTOFF_MINUTES,
} from "@/modules/delivery";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();
// 04:00 on 19 Oct in Manila; the first Slot starts at 08:00.
const NOW = new Date("2026-10-18T20:00:00Z");
const HUB = seedId("hub:pasig");
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

async function newCart(): Promise<string> {
  const cart = await db.cart.create({
    data: { guestTokenHash: randomUUID().replaceAll("-", "") },
  });
  return cart.id;
}

async function firstSlot() {
  return db.slot.findFirstOrThrow({
    where: { hubId: HUB },
    orderBy: { startsAt: "asc" },
  });
}

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
}, 60_000);
beforeEach(async () => {
  await db.cart.deleteMany();
  await db.slot.updateMany({ data: { booked: 0, capacity: 20 } });
});
afterAll(() => db.$disconnect());

describe("resolveZone", () => {
  it("matches a whole city, ignoring case, accents and the word City", async () => {
    for (const city of ["Pasig", "pasig city", "City of Pasig", "  PASIG "]) {
      const zone = await resolveZone({ city, barangay: "Kapitolyo" });
      expect(zone?.zoneId, city).toBe(seedId("zone:pasig-mandaluyong"));
    }
    const makati = await resolveZone({ city: "Makati", barangay: "Poblacion" });
    expect(makati).toMatchObject({
      hubId: HUB,
      name: "Makati and Taguig",
      fees: {
        deliveryFeeCents: 6900,
        freeDeliveryOverCents: 200000,
        minOrderCents: 70000,
      },
    });
  });

  it("matches only the listed barangays of a partly served city", async () => {
    expect(
      (await resolveZone({ city: "Quezon City", barangay: "Libis" }))?.zoneId
    ).toBe(seedId("zone:quezon-city-south"));
    expect(
      await resolveZone({ city: "Quezon City", barangay: "Diliman" })
    ).toBeNull();
    expect(
      await resolveZone({ city: "Cebu City", barangay: "Lahug" })
    ).toBeNull();
  });

  it("lists the served cities and their barangays for the address form", async () => {
    const areas = await listServiceAreas();
    expect(areas).toContainEqual({ city: "Pasig", barangays: null });
    expect(areas.find((a) => a.city === "Quezon City")?.barangays).toContain(
      "Libis"
    );
  });
});

describe("listSlots", () => {
  it("offers upcoming Slots with how full they are, never inside the cutoff", async () => {
    const slots = await listSlots(HUB, { now: NOW });
    expect(slots.length).toBeGreaterThan(30);
    expect(slots[0]).toMatchObject({
      state: "open",
      held: false,
      date: "2026-10-19",
    });
    expect(
      slots.every(
        (s) => s.startsAt.getTime() > minutes(SLOT_CUTOFF_MINUTES).getTime()
      )
    ).toBe(true);

    // At 07:00 Manila the 08:00 Slot has closed.
    const later = await listSlots(HUB, { now: minutes(180) });
    expect(later[0].startsAt.getTime()).toBeGreaterThan(
      slots[0].startsAt.getTime()
    );
  });

  it("counts bookings and other carts' live holds, and marks the cart's own hold", async () => {
    const slot = await firstSlot();
    await db.slot.update({
      where: { id: slot.id },
      data: { capacity: 4, booked: 1 },
    });
    const mine = await newCart();
    expect(await holdSlot(await newCart(), slot.id, NOW)).toMatchObject({
      ok: true,
    });
    expect((await listSlots(HUB, { now: NOW }))[0].state).toBe("few");
    expect(await holdSlot(await newCart(), slot.id, NOW)).toMatchObject({
      ok: true,
    });
    expect(await holdSlot(mine, slot.id, NOW)).toMatchObject({ ok: true });
    expect((await listSlots(HUB, { now: NOW, cartId: mine }))[0]).toMatchObject(
      { state: "few", held: true }
    );
    expect((await listSlots(HUB, { now: NOW }))[0].state).toBe("full");
    // Holds lapse after 10 minutes: 3 of 4 places free again.
    expect(
      (await listSlots(HUB, { now: minutes(11), cartId: mine }))[0]
    ).toMatchObject({
      state: "few",
      held: false,
    });
  });
});

describe("holdSlot", () => {
  it("holds for 10 minutes, and a new choice replaces the old hold", async () => {
    const cart = await newCart();
    const [a, b] = await db.slot.findMany({
      where: { hubId: HUB },
      orderBy: { startsAt: "asc" },
      take: 2,
    });
    expect(await holdSlot(cart, a.id, NOW)).toEqual({
      ok: true,
      expiresAt: minutes(10),
    });
    await holdSlot(cart, b.id, NOW);
    expect(await getSlotHold(cart, NOW)).toEqual({
      slotId: b.id,
      expiresAt: minutes(10),
    });
    expect(await getSlotHold(cart, minutes(10))).toBeNull();
  });

  it("refuses a full, closed or unknown Slot", async () => {
    const slot = await firstSlot();
    await db.slot.update({
      where: { id: slot.id },
      data: { capacity: 1, booked: 1 },
    });
    expect(await holdSlot(await newCart(), slot.id, NOW)).toEqual({
      ok: false,
      reason: "full",
    });
    const next = await db.slot.findFirstOrThrow({
      where: { hubId: HUB, startsAt: { gt: slot.startsAt } },
      orderBy: { startsAt: "asc" },
    });
    const closed = new Date(next.startsAt.getTime() - 30 * 60_000);
    expect(await holdSlot(await newCart(), next.id, closed)).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(await holdSlot(await newCart(), randomUUID(), NOW)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("gives the last place to exactly one of many carts at once", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { capacity: 1 } });
    const carts = await Promise.all(Array.from({ length: 6 }, newCart));
    const results = await Promise.all(
      carts.map((c) => holdSlot(c, slot.id, NOW))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.slotHold.count({ where: { slotId: slot.id } })).toBe(1);
  });
});

describe("bookSlot", () => {
  it("books with the cart's hold, then frees the hold", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { capacity: 1 } });
    const cart = await newCart();
    await holdSlot(cart, slot.id, NOW);
    expect(
      await appDb.$transaction((tx) =>
        bookSlot(tx, { slotId: slot.id, cartId: cart, now: minutes(5) })
      )
    ).toBe(true);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slot.id } })).booked
    ).toBe(1);
    expect(await getSlotHold(cart, minutes(5))).toBeNull();
  });

  it("will not book a place another cart is holding", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { capacity: 1 } });
    await holdSlot(await newCart(), slot.id, NOW);
    const late = await newCart();
    expect(
      await appDb.$transaction((tx) =>
        bookSlot(tx, { slotId: slot.id, cartId: late, now: NOW })
      )
    ).toBe(false);
  });

  it("books the last place once when two Orders race for it", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { capacity: 1 } });
    const carts = [await newCart(), await newCart()];
    const results = await Promise.all(
      carts.map((cartId) =>
        appDb.$transaction((tx) =>
          bookSlot(tx, { slotId: slot.id, cartId, now: NOW })
        )
      )
    );
    expect(results.sort()).toEqual([false, true]);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slot.id } })).booked
    ).toBe(1);
  });

  it("releases a booked place when an Order is cancelled", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { booked: 2 } });
    await appDb.$transaction((tx) => releaseSlot(tx, slot.id));
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slot.id } })).booked
    ).toBe(1);
  });
});

it("purgeExpiredHolds removes only lapsed holds", async () => {
  const slot = await firstSlot();
  await holdSlot(await newCart(), slot.id, NOW);
  await holdSlot(await newCart(), slot.id, minutes(8));
  expect(await purgeExpiredHolds(minutes(12))).toBe(1);
  expect(await db.slotHold.count()).toBe(1);
});
