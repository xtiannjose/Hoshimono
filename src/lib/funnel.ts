import type { FunnelStep } from "@/generated/prisma/enums";
import { manilaDate } from "@/lib/dates";
import { db } from "@/lib/db";

// The shopping funnel (ADR 0017): how many times each step happened per
// Manila day. One row per day and step, no identifier, no cookie, no third
// party, so no consent banner.

export type { FunnelStep };

export const FUNNEL_STEPS: readonly FunnelStep[] = [
  "product_viewed",
  "added_to_cart",
  "checkout_started",
  "order_placed",
];

/** One more of this step today in Manila: a single atomic upsert. */
export async function countStep(step: FunnelStep, now = new Date()) {
  await db.$executeRaw`
    INSERT INTO funnel_counts (day, step, count)
    VALUES (${manilaDate(now)}::date, ${step}::funnel_step, 1)
    ON CONFLICT (day, step) DO UPDATE SET count = funnel_counts.count + 1`;
}

/** Each step's total from one Manila date to another, both included. */
export async function funnelTotals(
  from: string,
  to: string
): Promise<Record<FunnelStep, number>> {
  const rows = await db.funnelCount.groupBy({
    by: ["step"],
    where: { day: { gte: new Date(from), lte: new Date(to) } },
    _sum: { count: true },
  });
  const totals = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0])) as Record<
    FunnelStep,
    number
  >;
  for (const row of rows) totals[row.step] = row._sum.count ?? 0;
  return totals;
}
