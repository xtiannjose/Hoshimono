import type { Metadata } from "next";

import { deliveryCoverage } from "@/app/_data/storefront";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { formatMoney } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await getMessages()).delivery;
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: localPath(await getLang(), "/delivery") },
  };
}

// Delivery coverage for everyone, signed in or not (PRD CAT-1).
export default async function DeliveryPage() {
  const [zones, m] = await Promise.all([deliveryCoverage(), getMessages()]);
  const t = m.delivery;
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <h1 className="type-h1">{t.title}</h1>
      <p className="text-muted-foreground mt-2">{t.lead}</p>
      {zones.length === 0 ? (
        <p className="mt-6">{t.none}</p>
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
                  : t.allOf(zone.cities)}
              </p>
              <p className="text-muted-foreground text-sm">
                {t.fees(
                  formatMoney(zone.deliveryFeeCents),
                  zone.freeDeliveryOverCents === null
                    ? null
                    : formatMoney(zone.freeDeliveryOverCents),
                  formatMoney(zone.minOrderCents)
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
