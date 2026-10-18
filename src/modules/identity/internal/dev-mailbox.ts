// End-to-end tests need the sign-in link that would be emailed. Outside
// production, and only with E2E_MAILBOX=1, the last link per address is
// kept in memory for /api/dev/mailbox. Never on in production.

const store = globalThis as unknown as { devMailbox?: Map<string, string> };

export function devMailboxEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" && process.env.E2E_MAILBOX === "1"
  );
}

export function rememberLink(email: string, url: string) {
  if (!devMailboxEnabled()) return;
  (store.devMailbox ??= new Map()).set(email.toLowerCase(), url);
}

export function lastLink(email: string): string | null {
  if (!devMailboxEnabled()) return null;
  return store.devMailbox?.get(email.toLowerCase()) ?? null;
}
