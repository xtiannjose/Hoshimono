import { takeToken } from "@/lib/rate-limit";

// Rate limits for sign-in (PRD ACC-1). Per address or number they stop spam
// to one person; per IP they stop scripts, kept generous because many
// Filipino mobile users share one carrier IP.
const QUARTER_HOUR = 15 * 60;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const PER_TARGET = 3;
const PER_IP = 30;
const CODE_CHECKS = 10;
// Codes count per number and IP, so a stranger elsewhere cannot use up a
// Customer's tries within the quarter hour. The daily cap per number bounds
// what one number costs; a stranger can spend it, and the email link still
// works then.
const CODES_PER_NUMBER_A_DAY = 10;
/** Every code texted in an hour: a script with many IPs and numbers stops here. */
export const CODES_AN_HOUR = 200;

type Rule = [key: string, limit: number, windowSeconds: number];

/**
 * Why a sign-in step is refused, with the minutes to wait when it is too
 * many tries; the action words it in the page's language (ADR 0019).
 */
export type LimitRefusal =
  { reason: "too_many"; minutes: number } | { reason: "texts_paused" };

async function firstRefusal(
  rules: Rule[],
  now: Date
): Promise<LimitRefusal | null> {
  for (const [key, limit, windowSeconds] of rules) {
    const token = await takeToken(key, limit, windowSeconds, now);
    if (!token.ok) {
      const minutes = Math.max(1, Math.ceil(token.retryAfterSeconds / 60));
      return { reason: "too_many", minutes };
    }
  }
  return null;
}

/** One inbox, however written: plus tags dropped, and Gmail's dots. */
export function linkKey(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  const name = local.split("+")[0];
  return domain === "gmail.com" || domain === "googlemail.com"
    ? `${name.replaceAll(".", "")}@gmail.com`
    : `${name}@${domain}`;
}

/** Null when a sign-in link may be emailed, else why not. */
export function linkLimits(email: string, ip: string, now = new Date()) {
  return firstRefusal(
    [
      [`link:ip:${ip}`, PER_IP, QUARTER_HOUR],
      [`link:email:${linkKey(email)}`, PER_TARGET, QUARTER_HOUR],
    ],
    now
  );
}

/** Null when a sign-in code may be texted, else why not. */
export async function codeLimits(
  phone: string,
  ip: string,
  now = new Date()
): Promise<LimitRefusal | null> {
  const tooMany = await firstRefusal(
    [
      [`code:ip:${ip}`, PER_IP, QUARTER_HOUR],
      [`code:phone-ip:${phone}:${ip}`, PER_TARGET, QUARTER_HOUR],
      [`code:phone-day:${phone}`, CODES_PER_NUMBER_A_DAY, DAY],
    ],
    now
  );
  if (tooMany) return tooMany;
  if (!(await takeToken("code:all", CODES_AN_HOUR, HOUR, now)).ok) {
    console.error("[sign-in] the hour's text budget is spent: codes paused");
    return { reason: "texts_paused" };
  }
  return null;
}

/** Null when a typed code may be checked, else why not. */
export function verifyLimits(phone: string, ip: string, now = new Date()) {
  return firstRefusal(
    [[`verify:phone-ip:${phone}:${ip}`, CODE_CHECKS, QUARTER_HOUR]],
    now
  );
}
