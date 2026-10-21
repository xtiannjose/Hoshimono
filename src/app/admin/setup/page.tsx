import type { Metadata } from "next";
import { Suspense } from "react";

import { formatSlot, WEEKDAYS } from "@/lib/dates";
import {
  getDefaultHubId,
  listSlotTemplates,
  listUpcomingSlots,
  listZonesForAdmin,
} from "@/modules/delivery";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import {
  AddWindowForm,
  SlotCapacityForm,
  WindowForm,
  ZoneFeesForm,
} from "./forms";

export const metadata: Metadata = { title: "Zones and Slots" };

/** "8:00 AM" from minutes after midnight. */
const clock = (minute: number) => {
  const h = Math.floor(minute / 60);
  return `${((h + 11) % 12) + 1}:${String(minute % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export default function SetupPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/setup" area="setup">
        <Setup />
      </StaffGate>
    </Suspense>
  );
}

/** Zone fees, the weekly Slot schedule and the next week's Slots (ADR 0012). */
async function Setup() {
  const hubId = await getDefaultHubId();
  const [zones, templates, slots] = await Promise.all([
    listZonesForAdmin(),
    hubId ? listSlotTemplates(hubId) : [],
    hubId ? listUpcomingSlots(hubId) : [],
  ]);
  return (
    <section className="grid max-w-5xl gap-10">
      <section aria-labelledby="h-zones" className="grid gap-4">
        <h1 id="h-zones" className="type-h2">
          Zones and fees
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          What each Zone charges. Customers see a change at their next look at
          the Cart or Checkout; placed Orders keep what they paid.
        </p>
        <ul className="divide-border grid divide-y">
          {zones.map((z) => (
            <li key={z.id} className="grid gap-2 py-4">
              <p>
                <b>{z.name}</b>{" "}
                <span className="text-muted-foreground text-sm">
                  {z.cities.join(", ")}
                  {z.barangays.length > 0 && ` (${z.barangays.join(", ")})`}
                </span>
              </p>
              <ZoneFeesForm
                zoneId={z.id}
                name={z.name}
                fees={{
                  deliveryFeeCents: z.deliveryFeeCents,
                  freeDeliveryOverCents: z.freeDeliveryOverCents,
                  minOrderCents: z.minOrderCents,
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-schedule" className="grid gap-4">
        <h2 id="h-schedule" className="type-h2">
          Weekly Slot schedule
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          Slots are made from this 7 days ahead. A change here applies to days
          not made yet; change a single day&apos;s Slot below.
        </p>
        <AddWindowForm />
        <div className="grid gap-4 md:grid-cols-2">
          {WEEKDAYS.map((day, weekday) => (
            <section
              key={day}
              aria-label={day}
              className="rounded-card border-border bg-card grid gap-2 border p-4"
            >
              <h3 className="type-h3">{day}</h3>
              {templates.filter((t) => t.weekday === weekday).length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No deliveries this day.
                </p>
              )}
              {templates
                .filter((t) => t.weekday === weekday)
                .map((t) => (
                  <WindowForm
                    key={t.id}
                    templateId={t.id}
                    label={`${clock(t.startMinute)} to ${clock(t.endMinute)}`}
                    capacity={t.capacity}
                  />
                ))}
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="h-slots" className="grid gap-4">
        <h2 id="h-slots" className="type-h2">
          The next 7 days
        </h2>
        <p className="text-muted-foreground max-w-2xl">
          Set a Slot to its booked number to close it to new Orders.
        </p>
        <div className="grid gap-2">
          {slots.map((s) => (
            <SlotCapacityForm
              key={s.id}
              slotId={s.id}
              label={formatSlot(s.startsAt, s.endsAt)}
              capacity={s.capacity}
              booked={s.booked}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
