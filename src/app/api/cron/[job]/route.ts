import { createHash, timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { purgeRateLimits } from "@/lib/rate-limit";
import { purgeExpiredHolds } from "@/modules/delivery";
import { runDueJobs } from "@/modules/jobs";
import { expireUnpaidOrders } from "@/modules/orders";

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
 * drops lapsed Slot holds, cancels unpaid online Orders, runs due jobs
 * and clears ended rate-limit windows.
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
  const holds = await purgeExpiredHolds(now);
  const unpaidOrders = await expireUnpaidOrders(now);
  const jobs = await runDueJobs(jobHandlers, { now });
  const rateLimits = await purgeRateLimits(now);
  return Response.json({ holds, unpaidOrders, jobs, rateLimits });
}
