import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ORDER_STATUS_LABEL } from "@/components/order/status-labels";
import { formatSlot } from "@/lib/dates";
import { listOrdersForStaff } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Picking" };

export default function PickIndex() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/pick" area="picking">
        <ToPick />
      </StaffGate>
    </Suspense>
  );
}

/** Orders being picked first, then those waiting, each by Slot time. */
async function ToPick() {
  const [picking, waiting] = await Promise.all([
    listOrdersForStaff({ status: "picking" }),
    listOrdersForStaff({ status: "confirmed" }),
  ]);
  const orders = [...picking, ...waiting];
  return (
    <section className="grid max-w-xl gap-4">
      <h1 className="type-h2">Picking</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Nothing to pick right now.</p>
      ) : (
        <ul className="grid gap-2">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/pick/${o.orderNo}`}
                className="rounded-card border-border bg-card hover:bg-muted flex min-h-14 items-center justify-between gap-3 border px-4 py-3"
              >
                <span>
                  <b className="font-mono">{o.orderNo}</b>
                  <span className="text-muted-foreground block text-sm tabular-nums">
                    {formatSlot(o.slot.startsAt, o.slot.endsAt)}
                  </span>
                </span>
                <span
                  className={`rounded-pill px-3 py-1 text-sm font-semibold ${o.status === "picking" ? "bg-accent-soft" : "bg-muted"}`}
                >
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
