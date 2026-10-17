import { timingSafeEqual } from "node:crypto";

import { connection } from "next/server";

import { purgeExpiredHolds } from "@/modules/delivery";
import { runDueJobs } from "@/modules/jobs";
import { expireUnpaidOrders } from "@/modules/orders";

import { jobHandlers } from "../handlers";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const sent = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return (
    !!secret &&
    sent.length === expected.length &&
    timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
  );
}

/**
 * Called every minute by the host (docs/03-ARCHITECTURE.md section 11):
 * drops lapsed Slot holds, cancels unpaid online Orders, runs due jobs.
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
  return Response.json({ holds, unpaidOrders, jobs });
}
