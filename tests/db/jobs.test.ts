import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db as appDb } from "@/lib/db";
import {
  enqueueJob,
  jobsHealth,
  MAX_ATTEMPTS,
  purgeDoneJobs,
  retryJob,
  runDueJobs,
} from "@/modules/jobs";

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
    await enqueueJob(appDb, "note", { n: 1 }, { runAt: NOW });
    await enqueueJob(appDb, "note", { n: 2 }, { runAt: later(30) });
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
    await enqueueJob(appDb, "flaky", {}, { runAt: NOW });
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

  it("sends a job that gave up back to the queue when staff ask", async () => {
    await enqueueJob(appDb, "flaky", {}, { runAt: NOW });
    const job = await db.job.findFirstOrThrow();
    // Still trying on its own: nothing to do.
    expect(await retryJob(job.id, NOW)).toBe(false);
    await db.job.update({
      where: { id: job.id },
      data: { attempts: MAX_ATTEMPTS, lastError: "Error: SMS gateway down" },
    });
    expect(await retryJob(job.id, NOW)).toBe(true);
    expect(await db.job.findFirstOrThrow()).toMatchObject({
      attempts: 0,
      runAt: NOW,
      lastError: "Error: SMS gateway down",
    });
    const seen: unknown[] = [];
    await runDueJobs(
      { flaky: async (p: unknown) => void seen.push(p) },
      { now: NOW }
    );
    expect(seen).toHaveLength(1);
  });

  it("never runs a job twice when two cron calls overlap", async () => {
    for (let n = 0; n < 10; n++)
      await enqueueJob(appDb, "count", { n }, { runAt: NOW });
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
    await enqueueJob(appDb, "mystery", {}, { runAt: NOW });
    expect(await runDueJobs({}, { now: NOW })).toEqual({ done: 0, failed: 1 });
    expect((await db.job.findFirstOrThrow()).lastError).toContain("No handler");
  });

  it("deletes finished jobs after 30 days", async () => {
    await enqueueJob(appDb, "note", {}, { runAt: NOW });
    await runDueJobs({ note: async () => {} }, { now: NOW });
    await enqueueJob(appDb, "note", {}, { runAt: later(10) });
    expect(await purgeDoneJobs(new Date(Date.now() + 29 * 86_400_000))).toBe(0);
    expect(await purgeDoneJobs(new Date(Date.now() + 31 * 86_400_000))).toBe(1);
    expect(await db.job.count()).toBe(1);
  });
});

describe("priority", () => {
  it("runs Order notices before reminders and alerts that came first", async () => {
    await enqueueJob(appDb, "reminder", {}, { runAt: later(-5), low: true });
    await enqueueJob(appDb, "notice", {}, { runAt: NOW });
    const ran: string[] = [];
    const record = (kind: string) => async () => {
      ran.push(kind);
    };
    await runDueJobs(
      { reminder: record("reminder"), notice: record("notice") },
      { now: NOW, limit: 1 }
    );
    expect(ran).toEqual(["notice"]);
  });
});

describe("jobsHealth", () => {
  it("counts jobs the cron left waiting, and jobs that gave up today", async () => {
    await db.job.createMany({
      data: [
        { kind: "a", runAt: later(-30) }, // due half an hour ago
        { kind: "b", runAt: later(-5) }, // due, the next tick takes it
        { kind: "c", runAt: later(30) }, // retrying later
        { kind: "d", runAt: later(-30), doneAt: NOW },
        {
          kind: "e",
          runAt: later(-30),
          attempts: MAX_ATTEMPTS,
          createdAt: NOW,
        },
      ],
    });
    expect(await jobsHealth(NOW)).toEqual({ behind: 1, failed: 1 });
  });
});
