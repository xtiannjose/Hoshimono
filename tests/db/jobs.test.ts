import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db as appDb } from "@/lib/db";
import { enqueueJob, MAX_ATTEMPTS, runDueJobs } from "@/modules/jobs";

import { createTestDb } from "./helpers";

const db = createTestDb();
const NOW = new Date("2026-10-01T20:00:00Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

beforeEach(() => db.job.deleteMany());
afterAll(() => db.$disconnect());

describe("runDueJobs", () => {
  it("runs due jobs once and marks them done", async () => {
    const seen: unknown[] = [];
    const handlers = { note: async (p: unknown) => void seen.push(p) };
    await enqueueJob(appDb, "note", { n: 1 }, NOW);
    await enqueueJob(appDb, "note", { n: 2 }, later(30));
    expect(await runDueJobs(handlers, { now: NOW })).toEqual({
      done: 1,
      failed: 0,
    });
    expect(seen).toEqual([{ n: 1 }]);
    expect(await runDueJobs(handlers, { now: later(1) })).toEqual({
      done: 0,
      failed: 0,
    });
    expect(await db.job.count({ where: { doneAt: { not: null } } })).toBe(1);
  });

  it("retries a failing job later, keeps the error, and stops after the last try", async () => {
    await enqueueJob(appDb, "flaky", {}, NOW);
    const fail = {
      flaky: async () => Promise.reject(new Error("SMS gateway down")),
    };
    expect(await runDueJobs(fail, { now: NOW })).toEqual({
      done: 0,
      failed: 1,
    });
    const job = await db.job.findFirstOrThrow();
    expect(job).toMatchObject({
      attempts: 1,
      lastError: "Error: SMS gateway down",
      doneAt: null,
    });
    expect(job.runAt).toEqual(later(1));
    // Not due again until the retry time.
    expect(await runDueJobs(fail, { now: NOW })).toEqual({
      done: 0,
      failed: 0,
    });
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      await runDueJobs(fail, { now: (await db.job.findFirstOrThrow()).runAt });
    }
    expect((await db.job.findFirstOrThrow()).attempts).toBe(MAX_ATTEMPTS);
    expect(await runDueJobs(fail, { now: later(10_000) })).toEqual({
      done: 0,
      failed: 0,
    });
  });

  it("never runs a job twice when two cron calls overlap", async () => {
    for (let n = 0; n < 10; n++) await enqueueJob(appDb, "count", { n }, NOW);
    let runs = 0;
    const handlers = {
      count: async () => {
        runs++;
        await new Promise((resolve) => setTimeout(resolve, 5));
      },
    };
    await Promise.all([
      runDueJobs(handlers, { now: NOW }),
      runDueJobs(handlers, { now: NOW }),
    ]);
    expect(runs).toBe(10);
  });

  it("fails a job whose kind has no handler", async () => {
    await enqueueJob(appDb, "mystery", {}, NOW);
    expect(await runDueJobs({}, { now: NOW })).toEqual({ done: 0, failed: 1 });
    expect((await db.job.findFirstOrThrow()).lastError).toContain("No handler");
  });
});
