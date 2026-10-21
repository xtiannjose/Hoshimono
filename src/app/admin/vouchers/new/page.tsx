import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { addDays, toManilaInput } from "@/lib/dates";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { VoucherForm } from "../voucher-form";

export const metadata: Metadata = { title: "New Voucher" };

export default function NewVoucherPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/vouchers/new" area="promotions">
        <NewVoucher />
      </StaffGate>
    </Suspense>
  );
}

async function NewVoucher() {
  await connection();
  const now = new Date();
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/vouchers"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Vouchers
        </Link>
        <h1 className="type-h2">New Voucher</h1>
      </div>
      <VoucherForm
        id={null}
        values={{
          code: "",
          kind: "percent",
          value: "10",
          maxDiscount: "",
          minSpend: "0.00",
          startsAt: toManilaInput(now),
          endsAt: toManilaInput(addDays(now, 30)),
          usageLimit: "",
          perCustomerLimit: "1",
          firstOrderOnly: false,
          isActive: true,
        }}
      />
    </section>
  );
}
