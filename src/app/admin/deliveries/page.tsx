import { PhoneIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";

import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireStaff } from "@/modules/identity";
import { listDeliveriesForRider } from "@/modules/orders";

import { DeliveredForm, FailedForm } from "../dispatch/forms";
import { AdminSkeleton } from "../staff-gate";

export const metadata: Metadata = { title: "My deliveries" };

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Deliveries />
    </Suspense>
  );
}

/** The Orders this Rider is carrying, for a phone at the door (ADR 0011). */
async function Deliveries() {
  const rider = await requireStaff("delivery", "/admin/deliveries");
  const stops = await listDeliveriesForRider(rider.id);
  return (
    <section className="grid max-w-xl gap-5">
      <h1 className="type-h2">My deliveries</h1>
      {stops.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing to deliver right now. The Dispatcher sends Orders to you.
        </p>
      ) : (
        <ol className="grid gap-4">
          {stops.map((s) => (
            <li
              key={s.id}
              className="rounded-card border-border bg-card grid gap-4 border p-4"
            >
              <div className="grid gap-1">
                <p className="text-[17px] leading-6">
                  <b>{s.customerName}</b>{" "}
                  <span className="text-muted-foreground font-mono text-sm">
                    {s.orderNo}
                  </span>
                </p>
                <p>
                  {s.address.line1}, {s.address.barangay}, {s.address.city}
                </p>
                <p className="text-sm">
                  <b>Landmark:</b> {s.address.landmark}
                </p>
                {s.riderNotes && (
                  <p className="rounded-field bg-warn-soft text-warn px-3 py-1.5 text-sm font-semibold">
                    Note: {s.riderNotes}
                  </p>
                )}
                <p className="text-muted-foreground text-sm tabular-nums">
                  {formatSlot(s.slot.startsAt, s.slot.endsAt)}
                </p>
                <p className="font-semibold">
                  {s.dueCents > 0
                    ? `Collect ${formatMoney(s.dueCents)} in cash`
                    : "Paid online: nothing to collect"}
                </p>
              </div>
              <a
                href={`tel:${s.contactPhone}`}
                className="rounded-pill border-input hover:bg-muted inline-flex min-h-14 items-center justify-center gap-2 border px-5 font-semibold"
              >
                <PhoneIcon size={22} aria-hidden />
                Call {s.customerName.split(" ")[0] || "the Customer"}
              </a>
              <DeliveredForm orderId={s.id} dueCents={s.dueCents} />
              <FailedForm orderId={s.id} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
