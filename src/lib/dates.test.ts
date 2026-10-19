import { describe, expect, it } from "vitest";

import { formatDateTime, formatSlot, manilaDate } from "./dates";

// 04:00 on 19 Oct in Manila.
const NOW = new Date("2026-10-18T20:00:00Z");

describe("dates", () => {
  it("reads the calendar date in Manila, not UTC", () => {
    expect(manilaDate(NOW)).toBe("2026-10-19");
    expect(manilaDate(new Date("2026-10-19T15:59:00Z"))).toBe("2026-10-19");
    expect(manilaDate(new Date("2026-10-19T16:00:00Z"))).toBe("2026-10-20");
  });

  it("names Slots by day and Manila time", () => {
    const at = (iso: string) => new Date(iso);
    // 14:00 to 16:00 Manila on 19 Oct.
    expect(
      formatSlot(at("2026-10-19T06:00:00Z"), at("2026-10-19T08:00:00Z"), NOW)
    ).toBe("Today, 2:00 to 4:00 PM");
    // 10:00 to 12:00 Manila on 20 Oct crosses noon.
    expect(
      formatSlot(at("2026-10-20T02:00:00Z"), at("2026-10-20T04:00:00Z"), NOW)
    ).toBe("Tomorrow, 10:00 AM to 12:00 PM");
    expect(
      formatSlot(at("2026-10-22T00:00:00Z"), at("2026-10-22T02:00:00Z"), NOW)
    ).toBe("Thu, 22 Oct, 8:00 to 10:00 AM");
  });

  it("writes dates day first, as docs/05 section 8 asks", () => {
    expect(formatDateTime(new Date("2026-10-19T08:05:00Z"))).toBe(
      "19 Oct 2026, 4:05 PM"
    );
  });
});
