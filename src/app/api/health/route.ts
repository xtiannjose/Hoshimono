import { connection } from "next/server";

import { db } from "@/lib/db";
import { getDefaultHubId, hasOpenSlot } from "@/modules/delivery";
import { jobsHealth } from "@/modules/jobs";
import { paymentsHealth } from "@/modules/payments";

// Uptime check: the app is up and can reach the database.
// With ?deep=1, the alerting check (docs/runbook.md): 503 and the names of
// what needs a person. Names only, no numbers or Order details, because
// the address is public.
export async function GET(request: Request) {
  await connection(); // never prerender
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("[health] database unreachable:", error);
    return Response.json({ ok: false }, { status: 503 });
  }
  if (new URL(request.url).searchParams.get("deep") !== "1") {
    return Response.json({ ok: true });
  }

  const hubId = await getDefaultHubId();
  const [jobs, payments, slot] = await Promise.all([
    jobsHealth(),
    paymentsHealth(),
    hubId ? hasOpenSlot(hubId) : false,
  ]);
  const problems = [
    jobs.behind > 0 && "jobs_behind",
    jobs.failed > 0 && "jobs_failed",
    payments.unmatchedEvents > 0 && "payment_events_unmatched",
    payments.refundsToCheck > 0 && "refunds_to_check",
    !slot && "no_open_slot",
  ].filter(Boolean);
  if (problems.length) console.error("[health] needs a person:", problems);
  return Response.json(
    { ok: problems.length === 0, problems },
    { status: problems.length ? 503 : 200 }
  );
}
