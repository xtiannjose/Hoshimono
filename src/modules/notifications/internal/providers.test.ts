import { afterEach, expect, it, vi } from "vitest";

import { emailProvider, lastMessage, lastSignInLink } from "./providers";

afterEach(() => vi.unstubAllEnvs());

it("keeps the last sign-in link even after another email to the same address", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("E2E_MAILBOX", "1");
  const link =
    "http://localhost:3100/api/auth/magic-link/verify?token=abc&callbackURL=%2F";
  const to = "Mara@hoshimono.test";
  vi.spyOn(console, "info").mockImplementation(() => {});
  await emailProvider().send({
    to,
    subject: "Sign in",
    text: `Tap to sign in: ${link}\nIt works once.`,
  });
  await emailProvider().send({
    to,
    subject: "Order confirmed",
    text: "Track it: http://localhost:3100/orders/SW-1",
  });
  expect(lastSignInLink("mara@hoshimono.test")).toBe(link);
  expect(lastMessage(to)).toContain("/orders/SW-1");
});
