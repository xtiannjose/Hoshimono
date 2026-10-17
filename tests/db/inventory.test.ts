import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDefaultHubId } from "@/modules/delivery";
import { getStockStates } from "@/modules/inventory";

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
