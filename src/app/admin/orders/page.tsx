import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/components/order/status-labels";
import { buttonVariants } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/enums";
import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listOrdersForStaff } from "@/modules/orders";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Orders" };

type Props = PageProps<"/admin/orders">;

const FIELD =
  "rounded-field border-input bg-card h-11 border px-3 text-base font-normal";
const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
const PAID_BY = { cod: "Cash", gcash: "GCash", card: "Card" } as const;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default function AdminOrders({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/orders" area="orders">
        <Queue searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

/** The order queue (PRD ADM-5): by Slot time, filtered and searched. */
async function Queue({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const params = await searchParams;
  const q = one(params.q);
  const day = one(params.day);
  const status = STATUSES.includes(one(params.status) as OrderStatus)
    ? (one(params.status) as OrderStatus)
    : undefined;
  const rows = await listOrdersForStaff({ q, day, status });

  return (
    <section className="grid gap-4">
      <h1 className="type-h2">Orders</h1>
      <form className="flex flex-wrap items-end gap-3" action="/admin/orders">
        <label className="grid gap-1 text-sm font-semibold">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Order number, name, email or mobile"
            className={`${FIELD} w-72`}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Status
          <select name="status" defaultValue={status ?? ""} className={FIELD}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Delivery day
          <input type="date" name="day" defaultValue={day} className={FIELD} />
        </label>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Show
        </button>
      </form>

      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Orders, {rows.length} shown, by delivery slot
          </caption>
          <thead className="bg-muted sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Order
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Slot
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Customer
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Payment
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted-foreground px-4 py-6">
                  No Orders match. Clear the filters to see them all.
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr
                key={o.id}
                className="border-border hover:bg-muted/60 border-t"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/orders/${o.orderNo}`}
                    className="font-mono font-semibold hover:underline"
                  >
                    {o.orderNo}
                  </Link>
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatSlot(o.slot.startsAt, o.slot.endsAt)}
                </td>
                <td className="px-4 py-2.5">
                  {o.customerName}
                  <span className="text-muted-foreground block tabular-nums">
                    {o.contactPhone}
                  </span>
                </td>
                <td className="px-4 py-2.5">{ORDER_STATUS_LABEL[o.status]}</td>
                <td className="px-4 py-2.5">
                  {o.paymentMethod ? PAID_BY[o.paymentMethod] : ""}
                  <span className="text-muted-foreground block">
                    {PAYMENT_STATUS_LABEL[o.paymentStatus]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMoney(o.finalTotalCents ?? o.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
