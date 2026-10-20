// The stand-in provider used in development and the e2e suite.
import { afterEach, describe, expect, it, vi } from "vitest";

import { fakePaidWebhook, paymentProvider } from ".";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("stand-in provider", () => {
  it("takes only the webhook it signed", () => {
    const fake = paymentProvider("fake")!;
    const { body, headers } = fakePaidWebhook("fake_cs_1", 69400);

    expect(fake.verifyWebhook(body, new Headers(headers))).toBe(true);
    expect(
      fake.verifyWebhook(body.replace("69400", "100"), new Headers(headers))
    ).toBe(false);
    expect(fake.verifyWebhook(body, new Headers())).toBe(false);
    expect(fake.parseEvent(body)).toMatchObject({
      kind: "paid",
      providerRef: "fake_cs_1",
      amountCents: 69400,
    });
  });

  it("never runs in a production build for a real domain", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_MAILBOX", "1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://hoshimono.ph");
    expect(paymentProvider("fake")).toBeNull();
  });
});
