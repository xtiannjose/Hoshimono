import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { manilaDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { dailyReport } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Daily report" };

type Props = PageProps<"/admin/report">;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const percent = (rate: number | null) =>
  rate === null ? "None yet" : `${Math.round(rate * 100)}%`;
/** "Wed 21 Oct" for a Manila date. */
const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
const daysBefore = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY_MS)
    .toISOString()
    .slice(0, 10);

export default function ReportPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/report" area="reports">
        <Report searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

/** One Manila day's numbers and the week before it (PRD ADM-10, ADR 0012). */
async function Report({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const raw = (await searchParams).day;
  const asked = Array.isArray(raw) ? raw[0] : raw;
  const today = manilaDate(new Date());
  const day = asked && DAY.test(asked) ? asked : today;
  const week = await Promise.all(
    Array.from({ length: 7 }, (_, i) => dailyReport(daysBefore(day, i)))
  );
  const r = week[0];
  const tiles = [
    ["Orders placed", String(r.placed)],
    ["Delivered", String(r.delivered)],
    ["Cancelled", String(r.cancelled)],
    ["Revenue", formatMoney(r.revenueCents)],
    ["Average basket", formatMoney(r.averageBasketCents)],
    ["Fill rate", percent(r.fillRate)],
    ["Substitution rate", percent(r.substitutionRate)],
    ["Late deliveries", String(r.lateDeliveries)],
  ];
  return (
    <section className="grid max-w-5xl gap-6">
      <h1 className="type-h2">Daily report</h1>
      <form className="flex flex-wrap items-end gap-3" action="/admin/report">
        <label className="grid gap-1 text-sm font-semibold">
          Day
          <input
            type="date"
            name="day"
            defaultValue={day}
            max={today}
            className="rounded-field border-input bg-card h-11 border px-3 text-base font-normal"
          />
        </label>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Show
        </button>
        {day !== today && (
          <Link
            href="/admin/report"
            className={buttonVariants({ variant: "ghost" })}
          >
            Today
          </Link>
        )}
      </form>
      <dl
        aria-label={`Numbers for ${dayLabel(day)}`}
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {tiles.map(([label, value]) => (
          <div
            key={label}
            className="rounded-card border-border bg-card grid gap-1 border p-4"
          >
            <dt className="text-muted-foreground text-sm font-semibold">
              {label}
            </dt>
            <dd className="type-h3 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Revenue is what delivered Orders were charged after picking. Fill rate
        and Substitution rate count the lines of delivered Orders. Late means
        delivered after the Slot ended.
      </p>
      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="type-h3 px-4 pt-4 text-left">
            The 7 days to {dayLabel(day)}
          </caption>
          <thead>
            <tr className="border-border border-b">
              {[
                "Day",
                "Placed",
                "Delivered",
                "Cancelled",
                "Revenue",
                "Fill rate",
                "Late",
              ].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${i ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {week.map((d) => (
              <tr key={d.day} className="border-border border-t">
                <th scope="row" className="px-4 py-2.5 font-semibold">
                  <Link
                    href={`/admin/report?day=${d.day}`}
                    className="hover:underline"
                  >
                    {dayLabel(d.day)}
                  </Link>
                </th>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {d.placed}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {d.delivered}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {d.cancelled}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMoney(d.revenueCents)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {percent(d.fillRate)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {d.lateDeliveries}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
