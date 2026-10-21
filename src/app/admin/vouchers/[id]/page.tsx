import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { toManilaInput } from "@/lib/dates";
import { getVoucherForAdmin } from "@/modules/pricing";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { VoucherForm } from "../voucher-form";

export const metadata: Metadata = { title: "Edit Voucher" };

type Props = PageProps<"/admin/vouchers/[id]">;

const pesos = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2);

export default function EditVoucherPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/vouchers" area="promotions">
        <EditVoucher params={params} searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

async function EditVoucher({ params, searchParams }: Props) {
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const voucher = await getVoucherForAdmin(id);
  // Referral rewards belong to one Customer and are not edited here.
  if (!voucher || voucher.customerId) notFound();
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/vouchers"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Vouchers
        </Link>
        <h1 className="type-h2 font-mono">{voucher.code}</h1>
        {created && (
          <p role="status" className="font-semibold">
            Voucher created.
          </p>
        )}
      </div>
      <VoucherForm
        id={voucher.id}
        values={{
          code: voucher.code,
          kind: voucher.kind,
          value:
            voucher.kind === "percent"
              ? String(voucher.value)
              : pesos(voucher.value),
          maxDiscount: pesos(voucher.maxDiscountCents),
          minSpend: pesos(voucher.minSpendCents),
          startsAt: toManilaInput(voucher.startsAt),
          endsAt: toManilaInput(voucher.endsAt),
          usageLimit:
            voucher.usageLimit === null ? "" : String(voucher.usageLimit),
          perCustomerLimit: String(voucher.perCustomerLimit),
          firstOrderOnly: voucher.firstOrderOnly,
          isActive: voucher.isActive,
        }}
      />
    </section>
  );
}
