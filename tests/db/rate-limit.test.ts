import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { purgeRateLimits, takeToken } from "@/lib/rate-limit";

import { createTestDb } from "./helpers";

const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

beforeEach(() => db.rateLimit.deleteMany());
afterAll(() => db.$disconnect());

describe("takeToken", () => {
  it("allows the limit within a window, then says how long to wait", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await takeToken("link:a@example.com", 3, 900, later(i))).toEqual({
        ok: true,
        retryAfterSeconds: 0,
      });
    }
    expect(await takeToken("link:a@example.com", 3, 900, later(10))).toEqual({
      ok: false,
      retryAfterSeconds: 890,
    });
    // Other keys count separately.
    expect((await takeToken("link:b@example.com", 3, 900, later(10))).ok).toBe(
      true
    );
  });

  it("starts a fresh window once the old one ends", async () => {
    for (let i = 0; i < 4; i++)
      await takeToken("otp:+639171234567", 3, 60, NOW);
    expect((await takeToken("otp:+639171234567", 3, 60, later(59))).ok).toBe(
      false
    );
    expect(await takeToken("otp:+639171234567", 3, 60, later(60))).toEqual({
      ok: true,
      retryAfterSeconds: 0,
    });
  });

  it("counts every one of many requests at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => takeToken("burst", 4, 60, NOW))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(4);
  });

  it("purges ended windows", async () => {
    await takeToken("old", 1, 60, NOW);
    await takeToken("new", 1, 600, NOW);
    expect(await purgeRateLimits(later(61))).toBe(1);
    expect((await db.rateLimit.findMany()).map((r) => r.key)).toEqual(["new"]);
  });
});
