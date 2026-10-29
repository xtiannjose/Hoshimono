import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDefaultHubId } from "@/modules/delivery";
import { db as appDb } from "@/lib/db";
import {
  countStock,
  getStockStates,
  listStockForAdmin,
  OutOfStockError,
  receiveStock,
  recordShrink,
  releaseStock,
  reserveStock,
  setLowStockThreshold,
  stockHistory,
} from "@/modules/inventory";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, new Date("2026-10-18T20:00:00Z"));
});
afterAll(() => db.$disconnect());

const product = (slug: string) => seedId(`product:${slug}`);

describe("getStockStates", () => {
  it("says in stock, a few left or out of stock, never the count", async () => {
    const hubId = (await getDefaultHubId())!;
    const states = await getStockStates(
      [
        product("magnolia-fresh-milk"),
        product("carabao-mangoes"),
        product("ube-roll"),
        "00000000-0000-0000-0000-000000000000",
      ],
      hubId
    );
    expect(states).toEqual({
      [product("magnolia-fresh-milk")]: "in_stock",
      [product("carabao-mangoes")]: "low",
      [product("ube-roll")]: "out",
      "00000000-0000-0000-0000-000000000000": "out",
    });
  });

  it("counts reserved units as gone", async () => {
    const hubId = (await getDefaultHubId())!;
    const id = product("magnolia-fresh-milk");
    const level = await db.stockLevel.findUniqueOrThrow({
      where: { productId_hubId: { productId: id, hubId } },
    });
    await db.stockLevel.update({
      where: { productId_hubId: { productId: id, hubId } },
      data: { reserved: level.onHand },
    });
    expect((await getStockStates([id], hubId))[id]).toBe("out");
  });
});

describe("getDefaultHubId", () => {
  it("returns the active Hub", async () => {
    expect(await getDefaultHubId()).toBe(seedId("hub:pasig"));
  });
});

describe("reserveStock", () => {
  it("names every short line and leaves nothing reserved", async () => {
    const hubId = (await getDefaultHubId())!;
    const ube = product("ube-roll"); // none on hand
    const mangoes = product("carabao-mangoes"); // 3 on hand
    const bread = product("pandesal-10-pieces");
    await db.stockLevel.updateMany({
      where: { productId: mangoes },
      data: { reserved: 0 },
    });
    const before = await db.stockLevel.findMany({
      where: { productId: { in: [ube, mangoes, bread] } },
    });
    const attempt = appDb.$transaction((tx) =>
      reserveStock(tx, {
        hubId,
        orderId: randomUUID(),
        lines: [
          { productId: bread, quantity: 1 },
          { productId: mangoes, quantity: 4 },
          { productId: ube, quantity: 1 },
        ],
      })
    );
    await expect(attempt).rejects.toThrow(OutOfStockError);
    await attempt.catch((e: OutOfStockError) =>
      expect(e.productIds.sort()).toEqual([mangoes, ube].sort())
    );
    expect(
      await db.stockLevel.findMany({
        where: { productId: { in: [ube, mangoes, bread] } },
      })
    ).toEqual(before);
  });
});

describe("releaseStock", () => {
  it("fails loudly when it would release more than is reserved", async () => {
    const hubId = (await getDefaultHubId())!;
    const bread = product("pandesal-10-pieces");
    await db.stockLevel.updateMany({
      where: { productId: bread },
      data: { reserved: 1 },
    });
    await expect(
      appDb.$transaction((tx) =>
        releaseStock(tx, {
          hubId,
          orderId: randomUUID(),
          lines: [{ productId: bread, quantity: 2 }],
        })
      )
    ).rejects.toThrow(/stock_levels_quantities_check/);
    const level = await db.stockLevel.findFirstOrThrow({
      where: { productId: bread, hubId },
    });
    expect(level.reserved).toBe(1);
  });
});

describe("keeping stock (ADR 0012)", () => {
  const staff = seedId("staff:dispatcher");
  const eggs = product("large-eggs-12-pack");

  it("receives, shrinks and counts stock, each with its movement and who did it", async () => {
    const hubId = (await getDefaultHubId())!;
    await db.stockLevel.update({
      where: { productId_hubId: { productId: eggs, hubId } },
      data: { onHand: 10, reserved: 2 },
    });

    expect(await receiveStock(hubId, eggs, 0, staff)).toEqual({
      ok: false,
      errors: { quantity: "Enter how many came in." },
    });
    expect(
      await receiveStock(hubId, eggs, 24, staff, "Supplier DR 1182")
    ).toEqual({
      ok: true,
    });
    expect(await recordShrink(hubId, eggs, 3, staff, "")).toEqual({
      ok: false,
      errors: { note: "Say what happened to them." },
    });
    // 34 on the shelf, 2 reserved: at most 32 can go.
    expect(await recordShrink(hubId, eggs, 33, staff, "Cracked")).toEqual({
      ok: false,
      errors: { quantity: "Only 32 are not reserved for Orders." },
    });
    expect(
      await recordShrink(hubId, eggs, 3, staff, "Cracked in delivery")
    ).toEqual({
      ok: true,
    });
    expect(await countStock(hubId, eggs, 30, staff, "Weekly count")).toEqual({
      ok: true,
    });

    expect(
      await db.stockLevel.findUniqueOrThrow({
        where: { productId_hubId: { productId: eggs, hubId } },
      })
    ).toMatchObject({ onHand: 30, reserved: 2 });
    const history = await stockHistory(hubId, eggs);
    expect(
      history.slice(0, 3).map((m) => [m.reason, m.delta, m.note, m.staffName])
    ).toEqual([
      ["adjustment", -1, "Weekly count", "Marites Aquino"],
      ["shrink", -3, "Cracked in delivery", "Marites Aquino"],
      ["receipt", 24, "Supplier DR 1182", "Marites Aquino"],
    ]);
  });

  it("lists what is low, at or under its threshold", async () => {
    const hubId = (await getDefaultHubId())!;
    await db.stockLevel.update({
      where: { productId_hubId: { productId: eggs, hubId } },
      data: { onHand: 6, reserved: 2 },
    });
    expect(await setLowStockThreshold(hubId, eggs, 4)).toEqual({ ok: true });
    const low = await listStockForAdmin(hubId, { low: true });
    expect(low.find((r) => r.productId === eggs)).toMatchObject({
      onHand: 6,
      reserved: 2,
      free: 4,
      lowStockThreshold: 4,
      low: true,
    });
    expect(low.every((r) => r.low)).toBe(true);
    const found = await listStockForAdmin(hubId, { q: "large eggs" });
    expect(found.map((r) => r.productId)).toContain(eggs);
  });

  it("takes a count below what is reserved, and stops selling (ADR 0022)", async () => {
    const hubId = (await getDefaultHubId())!;
    await db.stockLevel.update({
      where: { productId_hubId: { productId: eggs, hubId } },
      data: { onHand: 10, reserved: 6 },
    });
    expect(await countStock(hubId, eggs, 4, staff, "Two trays broke")).toEqual({
      ok: true,
    });
    const [row] = await listStockForAdmin(hubId, { q: "large eggs" });
    expect(row).toMatchObject({ onHand: 4, reserved: 6, free: 0, short: 2 });
    expect((await getStockStates([eggs], hubId))[eggs]).toBe("out");
    expect(await recordShrink(hubId, eggs, 1, staff, "Cracked")).toEqual({
      ok: false,
      errors: { quantity: "Only 0 are not reserved for Orders." },
    });
  });
});
