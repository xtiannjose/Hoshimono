import type { Metadata } from "next";

import { deliveryCoverage } from "@/app/_data/storefront";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Where we deliver",
  description:
    "The Metro Manila cities and barangays Hoshimono delivers to, with delivery fees and minimum orders.",
  alternates: { canonical: "/delivery" },
};

// Delivery coverage for everyone, signed in or not (PRD CAT-1).
export default async function DeliveryPage() {
  const zones = await deliveryCoverage();
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <h1 className="type-h1">Where we deliver</h1>
      <p className="text-muted-foreground mt-2">
        Same-day delivery in 2-hour slots. Add your address at checkout and we
        will tell you right away if we can deliver there.
      </p>
      {zones.length === 0 ? (
        <p className="mt-6">
          We are not delivering yet. Please check back soon.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {zones.map((zone) => (
            <li
              key={zone.name}
              className="rounded-card border-border bg-card grid gap-1 border p-5"
            >
              <h2 className="text-[17px] font-bold">{zone.name}</h2>
              <p>
                {zone.barangays.length > 0
                  ? `${zone.cities.join(", ")}: ${zone.barangays.join(", ")}`
                  : `All of ${zone.cities.join(" and ")}`}
              </p>
              <p className="text-muted-foreground text-sm">
                Delivery {formatMoney(zone.deliveryFeeCents)}
                {zone.freeDeliveryOverCents !== null &&
                  `, free over ${formatMoney(zone.freeDeliveryOverCents)}`}
                . Minimum order {formatMoney(zone.minOrderCents)}.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
