// Message providers behind small interfaces, chosen by environment. Only
// console providers exist until the Resend and SMS accounts are set up
// (business tracks, docs/07-ROADMAP.md section 11).

import { consoleMessagesAllowed, testMailboxEnabled } from "@/lib/test-mode";

export type Email = { to: string; subject: string; text: string };
export type Sms = { to: string; text: string };
export type Sent = { provider: string; ref: string | null };

export interface EmailProvider {
  send(message: Email): Promise<Sent>;
}

export interface SmsProvider {
  send(message: Sms): Promise<Sent>;
}

// For the e2e mailbox the last message per recipient is kept in memory
// (src/lib/test-mode.ts). On globalThis: Next dev loads modules per route.
const store = globalThis as unknown as {
  devOutbox?: Map<string, string>;
  devSignInLinks?: Map<string, string>;
};

function remember(to: string, text: string) {
  if (!testMailboxEnabled()) return;
  (store.devOutbox ??= new Map()).set(to.toLowerCase(), text);
  // Kept apart: an Order notice to the same address must not hide it.
  const link = /https?:\/\/\S*\/magic-link\/verify\S*/.exec(text)?.[0];
  if (link) (store.devSignInLinks ??= new Map()).set(to.toLowerCase(), link);
}

/** The last sign-in link emailed to a recipient, for the e2e mailbox only. */
export function lastSignInLink(to: string): string | null {
  if (!testMailboxEnabled()) return null;
  return store.devSignInLinks?.get(to.toLowerCase()) ?? null;
}

/** The last console message to a recipient, for the e2e mailbox only. */
export function lastMessage(to: string): string | null {
  if (!testMailboxEnabled()) return null;
  return store.devOutbox?.get(to.toLowerCase()) ?? null;
}

function refuseInProduction(kind: string) {
  if (!consoleMessagesAllowed()) {
    throw new Error(`No ${kind} provider configured for production.`);
  }
}

const consoleEmail: EmailProvider = {
  async send(message) {
    refuseInProduction("email");
    console.info(
      `[email] to ${message.to}: ${message.subject}\n${message.text}`
    );
    remember(message.to, `${message.subject}\n${message.text}`);
    return { provider: "console", ref: null };
  },
};

const consoleSms: SmsProvider = {
  async send(message) {
    refuseInProduction("SMS");
    console.info(`[sms] to ${message.to}: ${message.text}`);
    remember(message.to, message.text);
    return { provider: "console", ref: null };
  },
};

// shortcut: console only. Add Resend (EMAIL_PROVIDER=resend) and an SMS
// sender (SMS_PROVIDER=semaphore) when those accounts exist.
export function emailProvider(): EmailProvider {
  return consoleEmail;
}

export function smsProvider(): SmsProvider {
  return consoleSms;
}
