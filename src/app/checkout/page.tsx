import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { readCartOwner } from "@/app/cart/owner";
import { CartSync } from "@/components/cart/cart-button";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { formatSlot } from "@/lib/dates";
import { getCart, getCartId } from "@/modules/cart";
import { AddressForm } from "@/components/address/address-form";
import { listAddresses } from "@/modules/customers";
import {
  getDefaultHubId,
  getSlotHold,
  listServiceAreas,
  listSlots,
  resolveZone,
} from "@/modules/delivery";
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

  const [addresses, areas] = await Promise.all([
    listAddresses(customer.id),
    listServiceAreas(),
  ]);
  // Checkout collects the address on the same page (PRD CHK-1).
  const addressForm = (
    <AddressForm
      next="/checkout?address={id}"
      areas={areas}
      submitLabel="Deliver here"
      values={{
        label: addresses.length === 0 ? "Home" : "",
        line1: "",
        barangay: "",
        city: "",
        landmark: "",
        notes: "",
        isDefault: addresses.length === 0,
      }}
    />
  );
  if (addresses.length === 0) {
    return (
      <section
        aria-labelledby="h-where"
        className="rounded-card border-border bg-card mt-6 grid max-w-2xl gap-4 border p-5 md:p-7"
      >
        <h2 id="h-where" className="type-h3">
          Where should we deliver?
        </h2>
        {addressForm}
      </section>
    );
  }
  const address = addresses.find((a) => a.id === chosen) ?? addresses[0];
  const zone = await resolveZone(address);
  const cartId = await getCartId(owner);
  // No Zone for this address: still show real stock from the main Hub.
  const cart = await getCart(
    owner,
    zone
      ? { hubId: zone.hubId, zone: zone.fees }
      : { hubId: await getDefaultHubId(), zone: null }
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
      <details className="rounded-card border-border bg-card mt-6 border px-5 py-1 md:px-7">
        <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
          Deliver somewhere else? Add an address
        </summary>
        <div className="pt-2 pb-5">{addressForm}</div>
      </details>
      <CheckoutForm
        // A new address means a new Hub and Slots: start the form afresh.
        key={address.id}
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
        heldExpiresAt={hold?.expiresAt ?? null}
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
