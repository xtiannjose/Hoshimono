import { MapPinIcon } from "@phosphor-icons/react/ssr";
import { readCartOwner } from "@/app/[lang]/cart/owner";
import Link from "@/components/link";
import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { formatSlot } from "@/lib/dates";
import { getDefaultAddress } from "@/modules/customers";
import { listSlots, resolveZone } from "@/modules/delivery";

const PILL =
  "rounded-pill hover:bg-muted inline-flex h-12 items-center gap-2.5 px-3 max-sm:px-2.5";

function Pill({
  href,
  top,
  main,
}: {
  href: string;
  top: string;
  main: string;
}) {
  return (
    <Link href={href} className={PILL}>
      <MapPinIcon size={22} aria-hidden />
      <span className="text-left leading-[18px] max-sm:sr-only">
        <small className="text-muted-foreground block text-xs leading-4">
          {top}
        </small>
        <b className="block max-w-[180px] truncate text-sm font-bold">{main}</b>
      </span>
    </Link>
  );
}

/** Before we know the shopper: a link to the coverage page. */
export function DeliveryButton({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].shell;
  return <Pill href="/delivery" top={t.deliverTo} main={t.chooseArea} />;
}

/**
 * Header pill with the area and next Slot (docs/05 DeliveryButton). Signed
 * in with a served address it names the place and the next open Slot, and
 * opens the address book; otherwise it opens the coverage page.
 */
export async function DeliverySlot({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].shell;
  const owner = await readCartOwner();
  if (!owner || !("customerId" in owner)) {
    return <DeliveryButton lang={lang} />;
  }
  const address = await getDefaultAddress(owner.customerId);
  const zone = address ? await resolveZone(address) : null;
  if (!address || !zone) {
    return (
      <Pill href="/account/addresses" top={t.deliverTo} main={t.addAddress} />
    );
  }
  const next = (await listSlots(zone.hubId)).find((s) => s.state !== "full");
  return (
    <Pill
      href="/account/addresses"
      top={t.deliverToPlace(address.label, address.barangay)}
      main={
        next
          ? t.nextSlot(formatSlot(next.startsAt, next.endsAt, undefined, lang))
          : t.noSlots
      }
    />
  );
}
