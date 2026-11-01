import { afterEach, describe, expect, it, vi } from "vitest";

import { consoleMessagesAllowed, testMailboxEnabled } from "./test-mode";

afterEach(() => vi.unstubAllEnvs());

describe("test mode", () => {
  it("never opens the mailbox or console senders on a real host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_MAILBOX", "1");
    for (const url of [
      "https://hoshimono.ph",
      "http://localhost.evil.example",
      "",
    ]) {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", url);
      expect(testMailboxEnabled(), url).toBe(false);
      expect(consoleMessagesAllowed(), url).toBe(false);
    }
  });

  it("opens for the e2e suite's production build on localhost", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_MAILBOX", "1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3100");
    expect(testMailboxEnabled()).toBe(true);
    vi.stubEnv("E2E_MAILBOX", "");
    expect(testMailboxEnabled()).toBe(false);
    expect(consoleMessagesAllowed()).toBe(false);
  });

  it("stays closed on any Vercel deployment, even one built for development", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("E2E_MAILBOX", "1");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(consoleMessagesAllowed()).toBe(false);
    expect(testMailboxEnabled()).toBe(false);
  });

  it("allows console senders in development, the mailbox only on request", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("E2E_MAILBOX", "");
    expect(consoleMessagesAllowed()).toBe(true);
    expect(testMailboxEnabled()).toBe(false);
  });
});
