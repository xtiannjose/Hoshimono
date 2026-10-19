import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedDatabase } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();

// 20:00 UTC on 18 Oct is already 04:00 on 19 Oct in Manila.
const NOW = new Date("2026-10-18T20:00:00Z");

async function snapshot() {
  return {
    hubs: await db.hub.count(),
    zones: await db.zone.count(),
    categories: await db.category.count(),
    products: await db.product.count(),
    stockLevels: await db.stockLevel.count(),
    slots: await db.slot.count(),
    staff: await db.staff.count(),
    customers: await db.customer.count(),
    addresses: await db.address.count(),
  };
}

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, NOW);
});
afterAll(() => db.$disconnect());

describe("seed", () => {
  it("loads the Phase 0 data set (data model section 6)", async () => {
    const counts = await snapshot();
    expect(counts).toMatchObject({
      hubs: 1,
      zones: 3,
      categories: 41,
      slots: 42,
      staff: 4,
      customers: 3,
      addresses: 3,
    });
    expect(counts.products).toBeGreaterThanOrEqual(150);
    expect(counts.stockLevels).toBe(counts.products);
  });

  it("includes the edge cases the storefront must show", async () => {
    expect(
      await db.product.count({ where: { isWeighed: true } })
    ).toBeGreaterThan(0);
    expect(
      await db.product.count({ where: { storage: "frozen" } })
    ).toBeGreaterThan(0);
    expect(await db.stockLevel.count({ where: { onHand: 0 } })).toBe(1);
    const roles = (await db.staff.findMany()).map((s) => s.role).sort();
    expect(roles).toEqual(["admin", "dispatcher", "merchandiser", "picker"]);
    expect(
      await db.address.count({
        where: { isDefault: true, zoneId: { not: null } },
      })
    ).toBe(3);
  });

  it("creates Slots from the Manila calendar day, not the UTC one", async () => {
    const first = await db.slot.findFirstOrThrow({
      orderBy: { startsAt: "asc" },
    });
    expect(first.date).toEqual(new Date("2026-10-19"));
    // 8:00 AM Manila is midnight UTC.
    expect(first.startsAt).toEqual(new Date("2026-10-19T00:00:00Z"));
    expect(first.endsAt).toEqual(new Date("2026-10-19T02:00:00Z"));
  });

  it("can run again without duplicating or changing ids", async () => {
    const before = await snapshot();
    const ids = (await db.product.findMany({ select: { id: true } })).map(
      (p) => p.id
    );
    await seedDatabase(db, NOW);
    expect(await snapshot()).toEqual(before);
    const after = (await db.product.findMany({ select: { id: true } })).map(
      (p) => p.id
    );
    expect(after.sort()).toEqual(ids.sort());
  }, 30_000); // re-seeding the whole catalogue takes seconds under load
});
