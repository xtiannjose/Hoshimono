import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Give up after this many tries; the row stays with its last error. */
export const MAX_ATTEMPTS = 5;
// A claimed job is invisible to other runners for this long.
const LEASE_MINUTES = 5;

type Client = Prisma.TransactionClient | typeof db;

/**
 * Queue work to run after the current transaction commits. Pass the
 * transaction client so the job exists only if the change it follows does.
 */
export async function enqueueJob(
  client: Client,
  kind: string,
  payload: Prisma.InputJsonObject,
  runAt = new Date()
): Promise<void> {
  await client.job.create({ data: { kind, payload, runAt } });
}

export type JobHandlers = Record<
  string,
  (payload: Prisma.JsonObject) => Promise<void>
>;

export type RunReport = { done: number; failed: number };

/**
 * Run due jobs once (docs/03-ARCHITECTURE.md section 11). Each job is
 * leased with FOR UPDATE SKIP LOCKED, so two cron runs never take the same
 * job. Failures retry with a growing delay, up to MAX_ATTEMPTS.
 */
export async function runDueJobs(
  handlers: JobHandlers,
  { now = new Date(), limit = 20 }: { now?: Date; limit?: number } = {}
): Promise<RunReport> {
  const lease = new Date(now.getTime() + LEASE_MINUTES * 60_000);
  const jobs = await db.$queryRaw<
    { id: string; kind: string; payload: Prisma.JsonObject; attempts: number }[]
  >`
    UPDATE jobs SET run_at = ${lease}, attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM jobs
      WHERE done_at IS NULL AND run_at <= ${now} AND attempts < ${MAX_ATTEMPTS}
      ORDER BY run_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED)
    RETURNING id, kind, payload, attempts`;

  const report: RunReport = { done: 0, failed: 0 };
  for (const job of jobs) {
    try {
      const handler = handlers[job.kind];
      if (!handler) throw new Error(`No handler for job kind "${job.kind}"`);
      await handler(job.payload);
      await db.job.update({
        where: { id: job.id },
        data: { doneAt: new Date() },
      });
      report.done++;
    } catch (error) {
      // 1, 4, 9, 16 minutes between tries.
      const retryAt = new Date(now.getTime() + job.attempts ** 2 * 60_000);
      await db.job.update({
        where: { id: job.id },
        data: { lastError: String(error).slice(0, 2000), runAt: retryAt },
      });
      report.failed++;
    }
  }
  return report;
}
