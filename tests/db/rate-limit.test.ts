import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { takeOrderAttempt } from "@/app/[lang]/checkout/order-limits";
import {
  CODES_AN_HOUR,
  codeLimits,
  linkKey,
} from "@/app/[lang]/sign-in/limits";
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

describe("takeOrderAttempt", () => {
  const IP = "203.0.113.7";
  const attempts = async (customerId: string, times: number, now = NOW) => {
    const results: boolean[] = [];
    for (let i = 0; i < times; i++) {
      results.push(await takeOrderAttempt(customerId, IP, now));
    }
    return results;
  };

  it("allows 10 Orders an hour per account", async () => {
    expect(await attempts("ana", 10)).not.toContain(false);
    expect(await takeOrderAttempt("ana", "198.51.100.1", NOW)).toBe(false);
    expect(await takeOrderAttempt("ana", IP, later(60 * 60))).toBe(true);
  });

  it("allows 20 Orders an hour from one IP across accounts", async () => {
    expect(await attempts("ana", 10)).not.toContain(false);
    expect(await attempts("ben", 10)).not.toContain(false);
    expect(await takeOrderAttempt("cora", IP, NOW)).toBe(false);
    expect(await takeOrderAttempt("cora", "198.51.100.1", NOW)).toBe(true);
  });
});

describe("sign-in code limits", () => {
  const minutes = (m: number) => later(m * 60);

  it("texts one number at most 10 codes a day, from any IPs", async () => {
    const phone = "+639171230000";
    for (let i = 0; i < 10; i++) {
      expect(await codeLimits(phone, `10.0.0.${i % 4}`, minutes(i * 20))).toBe(
        null
      );
    }
    expect(await codeLimits(phone, "10.0.1.1", minutes(220))).toMatch(
      /^Too many tries\. Please wait \d+ hours/
    );
    expect(await codeLimits(phone, "10.0.1.1", minutes(24 * 60))).toBe(null);
  });

  it(`stops texting codes to anyone after ${CODES_AN_HOUR} in an hour`, async () => {
    for (let i = 0; i < CODES_AN_HOUR; i++) {
      const n = String(i).padStart(4, "0");
      expect(
        await codeLimits(`+63917000${n}`, `10.1.${i % 250}.${i}`, NOW)
      ).toBe(null);
    }
    expect(await codeLimits("+639179999999", "10.2.0.1", NOW)).toBe(
      "We can't text codes right now. Please use the email link instead."
    );
  }, 30_000); // 800 counter updates

  it("counts one inbox once, however the address is written", () => {
    expect(linkKey("J.Uan+shop@Gmail.com")).toBe("juan@gmail.com");
    expect(linkKey("juan@googlemail.com")).toBe("juan@gmail.com");
    expect(linkKey("j.uan+x@example.com")).toBe("j.uan@example.com");
  });
});
