import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { readCartOwner } from "@/app/[lang]/cart/owner";
import { CartSync } from "@/components/cart/cart-button";
import {
  CheckoutForm,
  SummaryPreview,
} from "@/components/checkout/checkout-form";
import { CountStep } from "@/components/count-step";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { slotParts } from "@/lib/dates";
import { displayPhone } from "@/lib/phone";
import { getCart, getCartId } from "@/modules/cart";
import { AddressForm } from "@/components/address/address-form";
import { listAddresses } from "@/modules/customers";
import {
  getDefaultHubId,
  getSlotHold,
  listServiceAreas,
  listSlots,
  onlinePaused,
  resolveZone,
} from "@/modules/delivery";
import { requireCustomer } from "@/modules/identity";
import { paymentProvider } from "@/modules/payments";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({
  searchParams,
}: PageProps<"/[lang]/checkout">) {
  const t = await getMessages();
  return (
    <section className="wrap py-8 md:py-12">
      <h1 className="type-h1">{t.checkout.title}</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <Checkout searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Checkout({
  searchParams,
}: Pick<PageProps<"/[lang]/checkout">, "searchParams">) {
  const { address: chosen } = await searchParams;
  const lang = await getLang();
  const t = (await getMessages()).checkout;
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
      next={localPath(lang, "/checkout?address={id}")}
      areas={areas}
      submitLabel={t.deliverHere}
      first={addresses.length === 0}
      values={{
        label: addresses.length === 0 ? t.firstLabel : "",
        line1: "",
        barangay: "",
        city: "",
        landmark: "",
        notes: "",
        isDefault: false,
      }}
    />
  );
  if (addresses.length === 0) {
    // No address yet: show what is being bought beside the form (ADR 0018).
    const cart = await getCart(owner, {
      hubId: await getDefaultHubId(),
      zone: null,
    });
    if (cart.lines.length === 0) redirect(localPath(lang, "/cart"));
    return (
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <CartSync view={cart} />
        <section
          aria-labelledby="h-where"
          className="rounded-card border-border bg-card grid gap-4 border p-5 md:p-7"
        >
          <h2 id="h-where" className="type-h3">
            {t.whereTo}
          </h2>
          {addressForm}
        </section>
        <SummaryPreview cart={cart} />
      </div>
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
  if (cart.lines.length === 0) redirect(localPath(lang, "/cart"));

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
      <CountStep step="checkout_started" />
      <details className="rounded-card border-border bg-card mt-6 border px-5 py-1 md:px-7">
        <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
          {t.elsewhere}
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
          ...slotParts(s.startsAt, s.endsAt, now, lang),
          state: s.state,
        }))}
        heldSlotId={hold?.slotId ?? null}
        heldExpiresAt={hold?.expiresAt ?? null}
        phone={customer.phone ? displayPhone(customer.phone) : ""}
        onlinePayments={
          paymentProvider() !== null &&
          !(zone && (await onlinePaused(zone.hubId)))
        }
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
          <Skeleton key={i} className="rounded-card h-48" />
        ))}
      </div>
      <Skeleton className="rounded-card h-96" />
    </div>
  );
}
