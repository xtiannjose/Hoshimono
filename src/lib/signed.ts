import { createHmac, timingSafeEqual } from "node:crypto";

// Values put in links that must work without signing in, such as the stop
// link in a Cart Reminder (ADR 0014): "value.signature", HMAC-SHA256 with
// the app's auth secret.

function signature(value: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function signValue(value: string): string {
  return `${value}.${signature(value)}`;
}

/** The value a token carries, or null when it was not signed by us. */
export function verifySigned(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(signature(value));
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? value
    : null;
}
