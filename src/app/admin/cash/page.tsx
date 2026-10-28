import type { Metadata } from "next";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { manilaDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listCashDay, riderCashDay } from "@/modules/payments";

import { CountCashForm } from "../dispatch/forms";
import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Cash" };

type Props = PageProps<"/admin/cash">;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default function CashPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/cash" area="dispatch">
        <Cash searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

/** Each Rider's cash for a day, counted against what they recorded (ADR 0011). */
async function Cash({ searchParams }: { searchParams: Props["searchParams"] }) {
  const asked = one((await searchParams).day);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(asked)
    ? asked
    : manilaDate(new Date());
  const riders = await listCashDay(day);
  const details = await Promise.all(
    riders.map((r) => riderCashDay(r.riderId, day))
  );

  return (
    <section className="grid max-w-4xl gap-6">
      <h1 className="type-h2">Cash</h1>
      <form className="flex flex-wrap items-end gap-3" action="/admin/cash">
        <label className="grid gap-1 text-sm font-semibold">
          Day
          <input
            type="date"
            name="day"
            defaultValue={day}
            className="rounded-field border-input bg-card h-11 border px-3 text-base font-normal"
          />
        </label>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Show
        </button>
      </form>
      {riders.length === 0 ? (
        <p className="text-muted-foreground">
          No cash-on-delivery Orders were delivered this day.
        </p>
      ) : (
        <ul className="grid gap-4">
          {riders.map((r, i) => {
            const d = details[i];
            return (
              <li
                key={r.riderId}
                className="rounded-card border-border bg-card grid gap-3 border p-5"
              >
                <h2 className="type-h3">
                  {r.riderName}:{" "}
                  <span className="tabular-nums">
                    {formatMoney(r.recordedCents)}
                  </span>{" "}
                  <span className="text-muted-foreground text-base font-normal">
                    from {r.orderCount}{" "}
                    {r.orderCount === 1 ? "Order" : "Orders"}
                  </span>
                </h2>
                <ul className="grid gap-1 text-sm">
                  {d.orders.map((o) => (
                    <li
                      key={o.orderNo}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <span className="font-mono">{o.orderNo}</span>
                      <span className="tabular-nums">
                        {formatMoney(o.collectedCents)}
                        {o.collectedCents !== o.dueCents && (
                          <span className="text-warn font-semibold">
                            {" "}
                            (due {formatMoney(o.dueCents)}: {o.note})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {d.handover ? (
                  <p
                    className={
                      d.handover.shortCents > 0 ? "text-warn font-semibold" : ""
                    }
                  >
                    Counted {formatMoney(d.handover.countedCents)} by{" "}
                    {d.handover.countedBy}
                    {d.handover.shortCents > 0
                      ? `: ${formatMoney(d.handover.shortCents)} short. ${d.handover.note ?? ""}`
                      : d.handover.shortCents < 0
                        ? `: ${formatMoney(-d.handover.shortCents)} over.`
                        : ": matches."}
                  </p>
                ) : (
                  <CountCashForm riderId={r.riderId} day={day} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
