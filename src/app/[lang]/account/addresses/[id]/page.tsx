import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddressForm } from "@/components/address/address-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getAddress } from "@/modules/customers";
import { listServiceAreas } from "@/modules/delivery";
import { requireCustomer } from "@/modules/identity";

export const metadata: Metadata = { title: "Edit address" };

export default function EditAddressPage({
  params,
}: PageProps<"/[lang]/account/addresses/[id]">) {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Edit address</h1>
      <div className="mt-6">
        <Suspense
          fallback={<Skeleton className="rounded-card h-96 max-w-xl" />}
        >
          <EditAddress params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function EditAddress({
  params,
}: Pick<PageProps<"/[lang]/account/addresses/[id]">, "params">) {
  const { id } = await params;
  const customer = await requireCustomer(`/account/addresses/${id}`);
  const address = await getAddress(customer.id, id);
  if (!address) notFound();
  return (
    <AddressForm
      next="/account/addresses"
      areas={await listServiceAreas()}
      values={{ ...address, notes: address.notes ?? "" }}
    />
  );
}
