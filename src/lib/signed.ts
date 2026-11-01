import { createHmac, timingSafeEqual } from "node:crypto";

// Values put in links that must work without signing in, such as the stop
// link in a Cart Reminder (ADR 0014): "purpose:value:expiry.signature",
// HMAC-SHA256 with the app's auth secret. The purpose stops a token made
// for one link from working in another; the expiry, a link found years
// later in an old email.

const DAY_MS = 24 * 60 * 60 * 1000;

function signature(payload: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signValue(
  purpose: string,
  value: string,
  { days = 90, now = new Date() }: { days?: number; now?: Date } = {}
): string {
  const expires = Math.floor((now.getTime() + days * DAY_MS) / 1000);
  const payload = `${purpose}:${value}:${expires}`;
  return `${payload}.${signature(payload)}`;
}

/** The value a token carries for `purpose`, or null: not ours, another purpose, or expired. */
export function verifySigned(
  token: string,
  purpose: string,
  now = new Date()
): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(signature(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  const [kind, value, expires] = payload.split(":");
  if (kind !== purpose || !value) return null;
  return Number(expires) * 1000 > now.getTime() ? value : null;
}
