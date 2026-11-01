import { TruckIcon } from "@phosphor-icons/react/ssr";
import { Suspense, type ReactNode } from "react";

import { deliveryCoverage } from "@/app/_data/storefront";
import { readCartOwner } from "@/app/[lang]/cart/owner";
import Link from "@/components/link";
import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getDefaultAddress } from "@/modules/customers";
import { listSlots, resolveZone } from "@/modules/delivery";

const LINK =
  "decoration-border-strong font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current";

/**
 * Home's first line (ADR 0018): where we deliver, the next open Slot and
 * the fee for a signed-in Customer; the areas and fees for everyone else.
 */
export function DeliveryStrip({ lang }: { lang: Lang }) {
  return (
    <section aria-label={MESSAGES[lang].home.delivery} className="wrap pt-5">
      <div className="rounded-card bg-accent-soft flex items-start gap-3 px-4 py-3 md:items-center md:px-5">
        <TruckIcon size={22} aria-hidden className="mt-px shrink-0 md:mt-0" />
        <DeliveryLine lang={lang} />
      </div>
    </section>
  );
}

/** The Customer's next Slot and fee, or the areas we serve (also on Product pages). */
export function DeliveryLine({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={<Coverage lang={lang} />}>
      <ForYou lang={lang} />
    </Suspense>
  );
}

function Line({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-sm">
      {children}
    </p>
  );
}

async function Coverage({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].home;
  const zones = await deliveryCoverage();
  if (zones.length === 0) return null;
  const fee = Math.min(...zones.map((z) => z.deliveryFeeCents));
  const free = zones
    .map((z) => z.freeDeliveryOverCents)
    .filter((c): c is number => c !== null);
  return (
    <Line>
      <span>
        {t.coverage(
          // Cities, not Zone names: names like "Pasig and Mandaluyong"
          // read badly in a list.
          [...new Set(zones.flatMap((z) => z.cities))],
          formatMoney(fee),
          free.length ? formatMoney(Math.min(...free)) : null
        )}
      </span>
      <Link href="/delivery" className={LINK}>
        {t.whereWeDeliver}
      </Link>
    </Line>
  );
}

async function ForYou({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].home;
  const owner = await readCartOwner();
  if (!owner || !("customerId" in owner)) return <Coverage lang={lang} />;
  const address = await getDefaultAddress(owner.customerId);
  const zone = address ? await resolveZone(address) : null;
  if (!address || !zone) {
    return (
      <Line>
        <span>{address ? t.notServed : t.addAddress}</span>
        <Link href="/account/addresses" className={LINK}>
          {t.change}
        </Link>
      </Line>
    );
  }
  const next = (await listSlots(zone.hubId)).find((s) => s.state !== "full");
  const { deliveryFeeCents, freeDeliveryOverCents } = zone.fees;
  return (
    <Line>
      <b>{t.deliverTo(address.label, address.barangay)}</b>
      <span>
        {next
          ? t.nextSlot(formatSlot(next.startsAt, next.endsAt, undefined, lang))
          : t.noSlot}
      </span>
      <span className="text-muted-foreground">
        {t.fee(
          formatMoney(deliveryFeeCents),
          freeDeliveryOverCents === null
            ? null
            : formatMoney(freeDeliveryOverCents)
        )}
      </span>
      <Link href="/account/addresses" className={LINK}>
        {t.change}
      </Link>
    </Line>
  );
}
