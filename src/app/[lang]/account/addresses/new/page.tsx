import type { Metadata } from "next";
import { Suspense } from "react";

import { AddressForm } from "@/components/address/address-form";
import { Skeleton } from "@/components/ui/skeleton";
import { listServiceAreas } from "@/modules/delivery";
import { requireCustomer, safeNext } from "@/modules/identity";

export const metadata: Metadata = { title: "Add an address" };

export default function NewAddressPage({
  searchParams,
}: PageProps<"/[lang]/account/addresses/new">) {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Add an address</h1>
      <div className="mt-6">
        <Suspense
          fallback={<Skeleton className="rounded-card h-96 max-w-xl" />}
        >
          <NewAddress searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function NewAddress({
  searchParams,
}: Pick<PageProps<"/[lang]/account/addresses/new">, "searchParams">) {
  const { next } = await searchParams;
  const back = safeNext(typeof next === "string" ? next : "/account/addresses");
  await requireCustomer(
    `/account/addresses/new?next=${encodeURIComponent(back)}`
  );
  return (
    <AddressForm
      next={back}
      areas={await listServiceAreas()}
      values={{
        label: "",
        line1: "",
        barangay: "",
        city: "",
        landmark: "",
        notes: "",
        isDefault: false,
      }}
    />
  );
}
