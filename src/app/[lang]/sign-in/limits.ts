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

async function firstRefusal(rules: Rule[], now: Date): Promise<string | null> {
  for (const [key, limit, windowSeconds] of rules) {
    const token = await takeToken(key, limit, windowSeconds, now);
    if (!token.ok) {
      const minutes = Math.max(1, Math.ceil(token.retryAfterSeconds / 60));
      const hours = Math.ceil(minutes / 60);
      const wait =
        minutes < 60
          ? `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
          : hours === 1
            ? "an hour"
            : `${hours} hours`;
      return `Too many tries. Please wait ${wait} and try again.`;
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

/** Null when a sign-in link may be emailed, else what to tell the person. */
export function linkLimits(email: string, ip: string, now = new Date()) {
  return firstRefusal(
    [
      [`link:ip:${ip}`, PER_IP, QUARTER_HOUR],
      [`link:email:${linkKey(email)}`, PER_TARGET, QUARTER_HOUR],
    ],
    now
  );
}

/** Null when a sign-in code may be texted, else what to tell the person. */
export async function codeLimits(
  phone: string,
  ip: string,
  now = new Date()
): Promise<string | null> {
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
    return "We can't text codes right now. Please use the email link instead.";
  }
  return null;
}

/** Null when a typed code may be checked, else what to tell the person. */
export function verifyLimits(phone: string, ip: string, now = new Date()) {
  return firstRefusal(
    [[`verify:phone-ip:${phone}:${ip}`, CODE_CHECKS, QUARTER_HOUR]],
    now
  );
}
