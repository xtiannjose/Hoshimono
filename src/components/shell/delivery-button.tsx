import { MapPinIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { readCartOwner } from "@/app/cart/owner";
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
export function DeliveryButton() {
  return <Pill href="/delivery" top="Deliver to" main="Choose your area" />;
}

/**
 * Header pill with the area and next Slot (docs/05 DeliveryButton). Signed
 * in with a served address it names the place and the next open Slot, and
 * opens the address book; otherwise it opens the coverage page.
 */
export async function DeliverySlot() {
  const owner = await readCartOwner();
  if (!owner || !("customerId" in owner)) return <DeliveryButton />;
  const address = await getDefaultAddress(owner.customerId);
  const zone = address ? await resolveZone(address) : null;
  if (!address || !zone) {
    return (
      <Pill
        href="/account/addresses"
        top="Deliver to"
        main="Add your address"
      />
    );
  }
  const next = (await listSlots(zone.hubId)).find((s) => s.state !== "full");
  return (
    <Pill
      href="/account/addresses"
      top={`Deliver to ${address.label}, ${address.barangay}`}
      main={
        next
          ? `Next: ${formatSlot(next.startsAt, next.endsAt)}`
          : "No slots open"
      }
    />
  );
}
