import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listRiders } from "@/modules/identity";
import { listDispatchBoard, type BoardRow } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import { SendOutForm, WithoutPinForm } from "./forms";

export const metadata: Metadata = { title: "Dispatch" };

export default function DispatchPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/dispatch" area="dispatch">
        <Board />
      </StaffGate>
    </Suspense>
  );
}

/** Picked Orders to send out, Orders on the road, and missed ones (ADR 0011). */
async function Board() {
  const [rows, riders] = await Promise.all([listDispatchBoard(), listRiders()]);
  const ready = rows.filter((r) => r.status === "picked");
  const out = rows.filter((r) => r.status === "out_for_delivery");
  const missed = rows.filter((r) => r.status === "delivery_failed");
  return (
    <section className="grid max-w-4xl gap-8">
      <h1 className="type-h2">Dispatch</h1>
      {riders.length === 0 && (
        <p className="rounded-field bg-warn-soft text-warn px-4 py-3 font-semibold">
          No Riders yet. An admin adds them under Staff, with their mobile
          number.
        </p>
      )}
      <Group title="Ready to go" rows={ready} empty="Nothing picked yet.">
        {(r) => <SendOutForm orderId={r.id} riders={riders} again={false} />}
      </Group>
      <Group title="Out now" rows={out} empty="No Orders on the road.">
        {(r) => <WithoutPinForm orderId={r.id} dueCents={r.dueCents} />}
      </Group>
      <Group
        title="Missed: send again or cancel"
        rows={missed}
        empty="No missed deliveries."
      >
        {(r) => (
          <div className="grid gap-2">
            <SendOutForm orderId={r.id} riders={riders} again />
            <Link
              href={`/admin/orders/${r.orderNo}`}
              className="text-sm font-semibold underline underline-offset-4"
            >
              Cancel it from the Order page
            </Link>
          </div>
        )}
      </Group>
    </section>
  );
}

function Group({
  title,
  rows,
  empty,
  children,
}: {
  title: string;
  rows: BoardRow[];
  empty: string;
  children: (row: BoardRow) => React.ReactNode;
}) {
  const id = `h-${title.toLowerCase().replaceAll(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="type-h3">
        {title} <span className="text-muted-foreground">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-border rounded-card border-border bg-card grid divide-y border">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-3 p-4 md:grid-cols-2">
              <div>
                <Link
                  href={`/admin/orders/${r.orderNo}`}
                  className="font-mono font-semibold hover:underline"
                >
                  {r.orderNo}
                </Link>
                <span className="text-muted-foreground block text-sm tabular-nums">
                  {formatSlot(r.slot.startsAt, r.slot.endsAt)}
                </span>
                <span className="block text-sm">
                  {r.customerName}, {r.barangay}
                </span>
                <span className="block text-sm">
                  {r.dueCents === null
                    ? "Paid online"
                    : `Collect ${formatMoney(r.dueCents)} in cash`}
                  {r.riderName && `, with ${r.riderName}`}
                </span>
              </div>
              {children(r)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
