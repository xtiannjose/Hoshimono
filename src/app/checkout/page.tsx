import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { readCartOwner } from "@/app/cart/owner";
import { CartSync } from "@/components/cart/cart-button";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { formatSlot } from "@/lib/dates";
import { getCart, getCartId } from "@/modules/cart";
import { listAddresses } from "@/modules/customers";
import { getSlotHold, listSlots, resolveZone } from "@/modules/delivery";
import { requireCustomer } from "@/modules/identity";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  return (
    <section className="wrap py-8 md:py-12">
      <h1 className="type-h1">Checkout</h1>
      <div data-no-cart-bar hidden />
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Checkout({
  searchParams,
}: Pick<PageProps<"/checkout">, "searchParams">) {
  const { address: chosen } = await searchParams;
  const customer = await requireCustomer("/checkout");
  // Also moves a guest Cart into the account right after sign-in.
  const owner = (await readCartOwner()) ?? { customerId: customer.id };

  const addresses = await listAddresses(customer.id);
  if (addresses.length === 0) {
    return (
      <div className="mt-6 grid max-w-xl justify-items-start gap-4">
        <p>Where should we deliver? Add an address to continue.</p>
        <Link
          href="/account/addresses/new?next=/checkout"
          className={PRIMARY_BUTTON}
        >
          Add an address
        </Link>
      </div>
    );
  }
  const address = addresses.find((a) => a.id === chosen) ?? addresses[0];
  const zone = await resolveZone(address);
  const cartId = await getCartId(owner);
  const cart = await getCart(
    owner,
    zone ? { hubId: zone.hubId, zone: zone.fees } : { hubId: null, zone: null }
  );
  if (cart.lines.length === 0) redirect("/cart");

  const now = new Date();
  const [slots, hold] = zone
    ? await Promise.all([
        listSlots(zone.hubId, { cartId, now }),
        cartId ? getSlotHold(cartId, now) : null,
      ])
    : [[], null];

  return (
    <>
      <CartSync view={cart} />
      <CheckoutForm
        // A new key per page load; resubmitting this form reuses it.
        idempotencyKey={randomUUID()}
        addresses={addresses}
        addressId={address.id}
        zone={
          zone
            ? { name: zone.name, deliveryFeeCents: zone.fees.deliveryFeeCents }
            : null
        }
        cart={cart}
        slots={slots.map((s) => ({
          id: s.id,
          date: s.date,
          label: formatSlot(s.startsAt, s.endsAt, now),
          state: s.state,
        }))}
        heldSlotId={hold?.slotId ?? null}
        phone={customer.phone ?? ""}
      />
    </>
  );
}

function CheckoutSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <div className="grid gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted rounded-card h-48 animate-pulse" />
        ))}
      </div>
      <div className="bg-muted rounded-card h-96 animate-pulse" />
    </div>
  );
}
