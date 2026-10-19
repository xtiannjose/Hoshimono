import { db } from "@/lib/db";

export type Token = { ok: boolean; retryAfterSeconds: number };

/**
 * Fixed-window rate limit in Postgres (no Redis account needed): one
 * atomic upsert per request, so concurrent requests are all counted.
 * Use one key per thing being protected, such as "link:<email>".
 */
export async function takeToken(
  key: string,
  limit: number,
  windowSeconds: number,
  now = new Date()
): Promise<Token> {
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const [row] = await db.$queryRaw<{ count: number; reset_at: Date }[]>`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at <= ${now} THEN 1
                   ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at <= ${now} THEN ${resetAt}
                      ELSE rate_limits.reset_at END
    RETURNING count, reset_at`;
  if (row.count <= limit) return { ok: true, retryAfterSeconds: 0 };
  return {
    ok: false,
    retryAfterSeconds: Math.ceil(
      (row.reset_at.getTime() - now.getTime()) / 1000
    ),
  };
}

/** Delete ended windows (cron tick). Returns how many went. */
export async function purgeRateLimits(now = new Date()): Promise<number> {
  const { count } = await db.rateLimit.deleteMany({
    where: { resetAt: { lte: now } },
  });
  return count;
}

/** The caller's IP as the host reports it, for per-IP limits. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
