import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/events/route";
import { countStep, funnelTotals } from "@/lib/funnel";

import { createTestDb } from "./helpers";

const db = createTestDb();

beforeEach(async () => {
  await db.funnelCount.deleteMany();
  await db.rateLimit.deleteMany();
});
afterAll(() => db.$disconnect());

describe("the shopping funnel (ADR 0017)", () => {
  it("counts steps per Manila day, with nothing about who", async () => {
    // 23:30 on 21 Oct in Manila is still 21 Oct; 00:30 on 22 Oct is not.
    await countStep("product_viewed", new Date("2026-10-21T15:30:00Z"));
    await countStep("product_viewed", new Date("2026-10-21T15:30:00Z"));
    await countStep("product_viewed", new Date("2026-10-21T16:30:00Z"));
    await countStep("order_placed", new Date("2026-10-21T16:30:00Z"));

    const rows = await db.funnelCount.findMany({
      orderBy: [{ day: "asc" }, { step: "asc" }],
    });
    expect(
      rows.map((r) => [r.day.toISOString().slice(0, 10), r.step, r.count])
    ).toEqual([
      ["2026-10-21", "product_viewed", 2],
      ["2026-10-22", "product_viewed", 1],
      ["2026-10-22", "order_placed", 1],
    ]);
    expect(Object.keys(rows[0]).sort()).toEqual(["count", "day", "step"]);

    expect(await funnelTotals("2026-10-21", "2026-10-22")).toEqual({
      product_viewed: 3,
      added_to_cart: 0,
      checkout_started: 0,
      order_placed: 1,
    });
    expect(
      (await funnelTotals("2026-10-22", "2026-10-22")).product_viewed
    ).toBe(1);
  });

  it("takes browser beacons for the first three steps only", async () => {
    const beacon = (body: string) =>
      POST(
        new Request("http://shop.test/api/events", {
          method: "POST",
          body,
          headers: { "x-forwarded-for": "203.0.113.9" },
        })
      );
    expect((await beacon("added_to_cart")).status).toBe(204);
    // Orders are counted where they are placed, not by the browser.
    expect((await beacon("order_placed")).status).toBe(400);
    expect((await beacon("anything")).status).toBe(400);
    const today = await funnelTotals("2000-01-01", "2100-01-01");
    expect(today.added_to_cart).toBe(1);
    expect(today.order_placed).toBe(0);
  });
});
