import { createHash, timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { purgeRateLimits } from "@/lib/rate-limit";
import { purgeExpiredHolds } from "@/modules/delivery";
import { purgeIdleCarts } from "@/modules/cart";
import { purgeDoneJobs, runDueJobs } from "@/modules/jobs";

import { jobHandlers } from "../handlers";

const digest = (text: string) => createHash("sha256").update(text).digest();

// Same-length digests, so any header compares in constant time and never throws.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const sent = digest(request.headers.get("authorization") ?? "");
  return timingSafeEqual(sent, digest(`Bearer ${secret}`));
}

/**
 * Called every minute by the host (docs/03-ARCHITECTURE.md section 11):
 * drops lapsed Slot holds, runs due jobs, clears ended rate-limit windows
 * and purges idle Carts and finished jobs.
 * Everything it does is idempotent, so an extra call is harmless.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/cron/[job]">
) {
  await connection();
  const { job } = await params;
  if (job !== "tick" || !authorised(request)) {
    return new Response("Not found", { status: 404 });
  }
  const now = new Date();
  const results: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  // Each step on its own: one failing never stops the others (notices
  // keep going out even if, say, the Slot hold purge fails).
  const steps: [string, () => Promise<unknown>][] = [
    ["holds", () => purgeExpiredHolds(now)],
    ["jobs", () => runDueJobs(jobHandlers, { now })],
    ["rateLimits", () => purgeRateLimits(now)],
    ["carts", () => purgeIdleCarts(now)],
    ["doneJobs", () => purgeDoneJobs(now)],
  ];
  for (const [name, step] of steps) {
    try {
      results[name] = await step();
    } catch (error) {
      console.error(`[cron] ${name} failed:`, error);
      errors[name] = String(error).slice(0, 300);
    }
  }
  const failed = Object.keys(errors).length > 0;
  return Response.json(
    { ...results, ...(failed ? { errors } : {}) },
    { status: failed ? 500 : 200 }
  );
}
