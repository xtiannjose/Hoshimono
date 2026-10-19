// End-to-end tests need the sign-in link that would be emailed. With
// E2E_MAILBOX=1, in development or an e2e production build on localhost
// (src/lib/test-mode.ts), the last link per address is kept in memory for
// /api/dev/mailbox. Never on for a real host.

import { testMailboxEnabled } from "@/lib/test-mode";

const store = globalThis as unknown as { devMailbox?: Map<string, string> };

export function devMailboxEnabled(): boolean {
  return testMailboxEnabled();
}

export function rememberLink(email: string, url: string) {
  if (!devMailboxEnabled()) return;
  (store.devMailbox ??= new Map()).set(email.toLowerCase(), url);
}

export function lastLink(email: string): string | null {
  if (!devMailboxEnabled()) return null;
  return store.devMailbox?.get(email.toLowerCase()) ?? null;
}
