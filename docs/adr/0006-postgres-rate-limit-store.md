---
status: accepted
---

# Rate limits are counted in PostgreSQL

Sign-in links, sign-in codes, code checks, Order placement and search suggestions are rate limited with fixed-window counters in a `rate_limits` table (`src/lib/rate-limit.ts`). Each request is one atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, so concurrent requests are all counted. The cron tick deletes ended windows.

Better Auth's own limiter only sees HTTP calls to `/api/auth/*`, not `auth.api` calls from Server Actions. So the sign-in sending endpoints are closed over HTTP (`disabledPaths`) and reachable only through our rate-limited Server Actions.

## Considered options

- **Upstash Redis or Vercel KV.** Faster and off the main database, but another account and secret before launch, and the accounts track is deferred. Revisit if rate-limit writes show up in database load.
- **Better Auth's built-in limiter with database storage.** Does not cover Server Action calls, which is how every sign-in method here starts.
- **In-memory counters.** Reset on every serverless cold start and are not shared between instances, so they do not limit anything on Vercel.

## Consequences

- One small write per protected request. Suggestions are the busiest path (120 per minute per IP).
- Per-IP limits stay generous because many Filipino mobile users share a carrier IP; the per-email, per-number and per-account limits do the real work.
- Moving to Redis later means reimplementing `takeToken` only; callers do not change.
