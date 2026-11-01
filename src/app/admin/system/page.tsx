import type { Metadata } from "next";
import { Suspense } from "react";

import { formatDateTime } from "@/lib/dates";
import { cronStatus, listOpenJobs } from "@/modules/jobs";
import { listPaymentEvents } from "@/modules/payments";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "System" };

const PANEL = "rounded-card border-border bg-card grid gap-3 border p-5";
const TABLE = "w-full text-left text-sm [&_td]:py-1.5 [&_td]:pr-3 [&_th]:pr-3";

export default function SystemPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/system" area="setup">
        <System />
      </StaffGate>
    </Suspense>
  );
}

/**
 * What the technical person checks first (docs/runbook.md, "Where the
 * technical person looks"): the cron, the jobs outbox, provider events.
 */
async function System() {
  const [cron, jobs, events] = await Promise.all([
    cronStatus(),
    listOpenJobs(),
    listPaymentEvents(),
  ]);
  return (
    <section className="grid max-w-5xl gap-6">
      <h1 className="type-h2">System</h1>

      <section aria-labelledby="h-cron" className={PANEL}>
        <h2 id="h-cron" className="type-h3">
          Cron
        </h2>
        <p className={cron.stopped ? "text-err font-semibold" : ""}>
          {cron.lastAt
            ? `Last ran ${formatDateTime(cron.lastAt)}.`
            : "It has not run yet."}{" "}
          {cron.stopped &&
            "It should run every minute: see section 5 of the runbook."}
        </p>
      </section>

      <section aria-labelledby="h-jobs" className={PANEL}>
        <h2 id="h-jobs" className="type-h3">
          Jobs not done ({jobs.length})
        </h2>
        {jobs.length === 0 ? (
          <p className="text-muted-foreground">Nothing waiting.</p>
        ) : (
          <table className={TABLE}>
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Due</th>
                <th scope="col">Tries</th>
                <th scope="col">Last error</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="font-mono">{j.kind}</td>
                  <td className="tabular-nums">{formatDateTime(j.runAt)}</td>
                  <td className="tabular-nums">{j.attempts}</td>
                  <td className="text-muted-foreground">
                    {j.lastError?.slice(0, 160) ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="h-events" className={PANEL}>
        <h2 id="h-events" className="type-h3">
          Payment events, newest first
        </h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground">None yet.</p>
        ) : (
          <table className={TABLE}>
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Event</th>
                <th scope="col">Order</th>
                <th scope="col">Applied</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={`${e.provider}:${e.providerEventId}`}>
                  <td className="tabular-nums">
                    {formatDateTime(e.receivedAt)}
                  </td>
                  <td>
                    {e.type}
                    <span className="text-muted-foreground block font-mono text-xs">
                      {e.providerEventId}
                    </span>
                  </td>
                  <td className="font-mono">{e.orderNo ?? "No match"}</td>
                  <td>{e.processedAt ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
