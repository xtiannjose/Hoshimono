import { describe, expect, it } from "vitest";

import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("accepts the ways people type a PH mobile number", () => {
    for (const raw of [
      "0917 123 4567",
      "+63 917-123-4567",
      "639171234567",
      "(0917) 123.4567",
    ]) {
      expect(normalizePhone(raw), raw).toBe("+639171234567");
    }
  });

  it("refuses landlines, short numbers and other countries", () => {
    for (const raw of [
      "02 8123 4567",
      "0917 123 456",
      "+1 917 123 4567",
      "",
      "abc",
    ]) {
      expect(normalizePhone(raw), raw).toBeNull();
    }
  });
});
