import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { listVouchersForAdmin } from "@/modules/pricing";

import { offerStatus, TONE } from "../promotions/offer-status";
import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Vouchers" };

export default function VouchersPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/vouchers" area="promotions">
        <Vouchers />
      </StaffGate>
    </Suspense>
  );
}

const gives = (v: {
  kind: "percent" | "amount" | "free_delivery";
  value: number;
  maxDiscountCents: number | null;
}) =>
  v.kind === "percent"
    ? `${v.value}% off${v.maxDiscountCents ? `, up to ${formatMoney(v.maxDiscountCents)}` : ""}`
    : v.kind === "amount"
      ? `${formatMoney(v.value)} off`
      : "Free delivery";

/** Staff Vouchers with their uses (Referral rewards are not listed). */
async function Vouchers() {
  await connection();
  const now = new Date();
  const vouchers = await listVouchersForAdmin();
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-h2">Vouchers</h1>
        <Link href="/admin/vouchers/new" className={buttonVariants()}>
          New Voucher
        </Link>
      </div>
      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Vouchers, {vouchers.length}</caption>
          <thead className="bg-muted">
            <tr>
              {["Code", "Gives", "Minimum", "Used", "Status"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-6">
                  No Vouchers yet.
                </td>
              </tr>
            )}
            {vouchers.map((v) => {
              const status = offerStatus(v, now);
              return (
                <tr
                  key={v.id}
                  className="border-border hover:bg-muted/60 border-t"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/vouchers/${v.id}`}
                      className="font-mono font-semibold hover:underline"
                    >
                      {v.code}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {gives(v)}
                    {v.firstOrderOnly && ", first orders"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {v.minSpendCents ? formatMoney(v.minSpendCents) : "None"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {v.uses}
                    {v.usageLimit !== null && ` of ${v.usageLimit}`}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-xs font-bold ${TONE[status.tone]}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
