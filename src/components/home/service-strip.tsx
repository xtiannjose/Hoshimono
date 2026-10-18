import { MoneyIcon, SealCheckIcon, TruckIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import { deliveryCoverage } from "@/app/_data/storefront";
import { formatMoney } from "@/lib/money";

/** Lime band under the hero (docs/05 section 6, ServiceStrip). */
export async function ServiceStrip() {
  const zones = await deliveryCoverage();
  const lowestFee = Math.min(...zones.map((z) => z.deliveryFeeCents));
  const freeOver = zones
    .map((z) => z.freeDeliveryOverCents)
    .filter((c): c is number => c !== null);
  const areas = (
    <Link href="/delivery" className="underline underline-offset-[3px]">
      See where we deliver
    </Link>
  );
  const items: { Icon: typeof TruckIcon; title: string; text: ReactNode }[] = [
    {
      Icon: TruckIcon,
      title: zones.length
        ? `Delivery from ${formatMoney(lowestFee)}`
        : "Same-day delivery",
      text: (
        <>
          {freeOver.length
            ? `Free over ${formatMoney(Math.min(...freeOver))}. `
            : ""}
          {areas}
        </>
      ),
    },
    {
      Icon: SealCheckIcon,
      title: "Freshness checked",
      text: "Every order inspected at pick",
    },
    {
      // shortcut: cash only until online payments (Phase 3); then add GCash and card.
      Icon: MoneyIcon,
      title: "Cash on delivery",
      text: "Pay the Rider when your order arrives",
    },
  ];
  return (
    <ul className="rounded-card bg-accent text-on-accent mt-8 grid gap-4 px-6 py-[18px] sm:grid-cols-3 sm:px-7">
      {items.map(({ Icon, title, text }) => (
        <li key={title} className="flex items-center gap-3">
          <Icon size={26} className="shrink-0" aria-hidden />
          <div>
            <b className="block font-bold">{title}</b>
            <span className="text-sm leading-5">{text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
