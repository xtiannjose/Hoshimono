import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db as appDb } from "@/lib/db";
import {
  addSlotTemplate,
  bookSlot,
  ensureSlots,
  listSlotTemplates,
  listZonesForAdmin,
  removeSlotTemplate,
  setSlotCapacity,
  setTemplateCapacity,
  updateZoneFees,
  SLOT_HOLD_MINUTES,
  getSlotHold,
  hasOpenSlot,
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
      data: { capacity: 20, booked: 17 },
    });
    const mine = await newCart();
    expect(
      await holdSlot(await newCart(), slot.id, { hubId: HUB, now: NOW })
    ).toMatchObject({
      ok: true,
    });
    expect((await listSlots(HUB, { now: NOW }))[0].state).toBe("few");
    expect(
      await holdSlot(await newCart(), slot.id, { hubId: HUB, now: NOW })
    ).toMatchObject({
      ok: true,
    });
    expect(
      await holdSlot(mine, slot.id, { hubId: HUB, now: NOW })
    ).toMatchObject({ ok: true });
    expect((await listSlots(HUB, { now: NOW, cartId: mine }))[0]).toMatchObject(
      { state: "few", held: true }
    );
    expect((await listSlots(HUB, { now: NOW }))[0].state).toBe("full");
    // Holds lapse after 10 minutes: 3 of 20 places free again, under 20%.
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
    expect(await holdSlot(cart, a.id, { hubId: HUB, now: NOW })).toEqual({
      ok: true,
      expiresAt: minutes(10),
    });
    await holdSlot(cart, b.id, { hubId: HUB, now: NOW });
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
    expect(
      await holdSlot(await newCart(), slot.id, { hubId: HUB, now: NOW })
    ).toEqual({
      ok: false,
      reason: "full",
    });
    const next = await db.slot.findFirstOrThrow({
      where: { hubId: HUB, startsAt: { gt: slot.startsAt } },
      orderBy: { startsAt: "asc" },
    });
    const closed = new Date(next.startsAt.getTime() - 30 * 60_000);
    expect(
      await holdSlot(await newCart(), next.id, { hubId: HUB, now: closed })
    ).toEqual({
      ok: false,
      reason: "closed",
    });
    expect(
      await holdSlot(await newCart(), randomUUID(), { hubId: HUB, now: NOW })
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("gives the last place to exactly one of many carts at once", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { capacity: 1 } });
    const carts = await Promise.all(Array.from({ length: 6 }, newCart));
    const results = await Promise.all(
      carts.map((c) => holdSlot(c, slot.id, { hubId: HUB, now: NOW }))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.slotHold.count({ where: { slotId: slot.id } })).toBe(1);
  });
});

describe("Slots belong to one Hub", () => {
  it("refuses to hold or book a Slot of another Hub", async () => {
    const other = await db.hub.create({
      data: { name: "Makati Hub", address: "Makati", lat: 14.55, lng: 121.02 },
    });
    const slot = await db.slot.create({
      data: {
        hubId: other.id,
        date: new Date("2026-10-19"),
        startsAt: minutes(300),
        endsAt: minutes(420),
        capacity: 5,
      },
    });
    const cart = await newCart();
    expect(await holdSlot(cart, slot.id, { hubId: HUB, now: NOW })).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(
      await appDb.$transaction((tx) =>
        bookSlot(tx, { slotId: slot.id, hubId: HUB, cartId: cart, now: NOW })
      )
    ).toBe(false);
    await db.slot.delete({ where: { id: slot.id } });
    await db.hub.delete({ where: { id: other.id } });
  });

  it("says only a few are left under 20% of capacity", async () => {
    const slot = await firstSlot();
    await db.slot.update({
      where: { id: slot.id },
      data: { capacity: 20, booked: 16 },
    });
    expect((await listSlots(HUB, { now: NOW }))[0].state).toBe("open");
    await db.slot.update({ where: { id: slot.id }, data: { booked: 17 } });
    expect((await listSlots(HUB, { now: NOW }))[0].state).toBe("few");
  });
});

describe("bookSlot inside the cutoff", () => {
  // 30 minutes before the first Slot starts: past the 90-minute cutoff.
  async function late() {
    const slot = await firstSlot();
    return { slot, at: new Date(slot.startsAt.getTime() - 30 * 60_000) };
  }
  const book = (slotId: string, cartId: string, now: Date) =>
    appDb.$transaction((tx) =>
      bookSlot(tx, { slotId, hubId: HUB, cartId, now })
    );

  it("lets a cart that holds a place book until the Slot starts", async () => {
    const { slot, at } = await late();
    const cart = await newCart();
    await db.slotHold.create({
      data: {
        slotId: slot.id,
        cartId: cart,
        expiresAt: new Date(at.getTime() + 60_000),
      },
    });
    expect(await book(slot.id, cart, at)).toBe(true);
  });

  it("refuses a cart with no hold, or whose hold has lapsed", async () => {
    const { slot, at } = await late();
    expect(await book(slot.id, await newCart(), at)).toBe(false);
    const lapsed = await newCart();
    await db.slotHold.create({
      data: {
        slotId: slot.id,
        cartId: lapsed,
        expiresAt: new Date(at.getTime() - SLOT_HOLD_MINUTES * 60_000),
      },
    });
    expect(await book(slot.id, lapsed, at)).toBe(false);
  });
});

describe("bookSlot", () => {
  it("books with the cart's hold, then frees the hold", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { capacity: 1 } });
    const cart = await newCart();
    await holdSlot(cart, slot.id, { hubId: HUB, now: NOW });
    expect(
      await appDb.$transaction((tx) =>
        bookSlot(tx, {
          slotId: slot.id,
          hubId: HUB,
          cartId: cart,
          now: minutes(5),
        })
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
    await holdSlot(await newCart(), slot.id, { hubId: HUB, now: NOW });
    const late = await newCart();
    expect(
      await appDb.$transaction((tx) =>
        bookSlot(tx, { slotId: slot.id, hubId: HUB, cartId: late, now: NOW })
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
          bookSlot(tx, { slotId: slot.id, hubId: HUB, cartId, now: NOW })
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

  it("fails loudly when there is no booked place to give back", async () => {
    const slot = await firstSlot(); // booked is 0
    await expect(
      appDb.$transaction((tx) => releaseSlot(tx, slot.id))
    ).rejects.toThrow();
    await expect(
      appDb.$transaction((tx) => releaseSlot(tx, randomUUID()))
    ).rejects.toThrow(/No Slot/);
    expect(
      (await db.slot.findUniqueOrThrow({ where: { id: slot.id } })).booked
    ).toBe(0);
  });
});

it("purgeExpiredHolds removes only lapsed holds", async () => {
  const slot = await firstSlot();
  await holdSlot(await newCart(), slot.id, { hubId: HUB, now: NOW });
  await holdSlot(await newCart(), slot.id, { hubId: HUB, now: minutes(8) });
  expect(await purgeExpiredHolds(minutes(12))).toBe(1);
  expect(await db.slotHold.count()).toBe(1);
});

describe("the Slot schedule (ADR 0012)", () => {
  it("keeps 7 days of Slots made from the weekly schedule, never touching existing ones", async () => {
    const before = await db.slot.count({ where: { hubId: HUB } });
    // A day later, one more day of 6 windows is due.
    const tomorrow = minutes(24 * 60);
    expect(await ensureSlots(tomorrow)).toBe(6);
    expect(await ensureSlots(tomorrow)).toBe(0);
    expect(await db.slot.count({ where: { hubId: HUB } })).toBe(before + 6);

    // A schedule change shapes only days not yet made.
    const templates = await listSlotTemplates(HUB);
    expect(templates).toHaveLength(42);
    // The day ensureSlots will make next is Tuesday 27 Oct, Manila.
    const tuesday = new Date("2026-10-27T00:00:00Z").getUTCDay();
    const window = templates.find((t) => t.weekday === tuesday)!;
    expect(await setTemplateCapacity(window.id, 12)).toEqual({ ok: true });
    await ensureSlots(minutes(2 * 24 * 60));
    const newest = await db.slot.findMany({
      where: { hubId: HUB },
      orderBy: { startsAt: "desc" },
      take: 6,
    });
    expect(newest.map((s) => s.capacity)).toContain(12);
    expect(
      (await db.slot.findMany({ where: { hubId: HUB } }))
        .filter((s) => s.startsAt <= tomorrow)
        .every((s) => s.capacity === 20)
    ).toBe(true);
  });

  it("adds and removes windows, refusing one that ends before it starts or repeats", async () => {
    expect(
      await addSlotTemplate(HUB, {
        weekday: 1,
        start: "20:00",
        end: "21:00",
        capacity: 8,
      })
    ).toMatchObject({ ok: true });
    expect(
      await addSlotTemplate(HUB, {
        weekday: 1,
        start: "20:00",
        end: "21:30",
        capacity: 8,
      })
    ).toEqual({
      ok: false,
      errors: { start: "There is already a window at 8:00 PM." },
    });
    expect(
      await addSlotTemplate(HUB, {
        weekday: 1,
        start: "18:00",
        end: "17:00",
        capacity: 8,
      })
    ).toEqual({ ok: false, errors: { end: "End after the start." } });
    const added = (await listSlotTemplates(HUB)).find(
      (t) => t.weekday === 1 && t.startMinute === 20 * 60
    )!;
    expect(await removeSlotTemplate(added.id)).toBe(true);
  });

  it("resizes or closes one Slot, never below what is booked", async () => {
    const slot = await firstSlot();
    await db.slot.update({ where: { id: slot.id }, data: { booked: 3 } });
    expect(await setSlotCapacity(slot.id, 2)).toEqual({
      ok: false,
      errors: { capacity: "3 are booked: at least 3." },
    });
    // Closing it: no more bookings, the 3 already booked stay.
    expect(await setSlotCapacity(slot.id, 3)).toEqual({ ok: true });
  });
});

describe("Zone fees (ADR 0012)", () => {
  it("changes what a Zone charges, and Checkout uses it at once", async () => {
    const zoneId = seedId("zone:pasig-mandaluyong");
    expect(
      await updateZoneFees(zoneId, {
        deliveryFeeCents: -1,
        freeDeliveryOverCents: null,
        minOrderCents: 0,
      })
    ).toEqual({ ok: false, errors: { deliveryFee: "Enter 0 or more." } });
    expect(
      await updateZoneFees(zoneId, {
        deliveryFeeCents: 5900,
        freeDeliveryOverCents: null,
        minOrderCents: 40000,
      })
    ).toEqual({ ok: true });
    const zone = await resolveZone({ city: "Pasig", barangay: "Kapitolyo" });
    expect(zone?.fees).toEqual({
      deliveryFeeCents: 5900,
      freeDeliveryOverCents: null,
      minOrderCents: 40000,
    });
    expect((await listZonesForAdmin()).map((z) => z.name)).toContain(
      "Pasig and Mandaluyong"
    );
  });
});

describe("hasOpenSlot", () => {
  it("is false once every Slot in the next day is full", async () => {
    expect(await hasOpenSlot(HUB, NOW)).toBe(true);
    await db.$executeRaw`UPDATE slots SET booked = capacity`;
    expect(await hasOpenSlot(HUB, NOW)).toBe(false);
  });
});
