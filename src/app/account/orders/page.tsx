import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ORDER_STATUS_LABEL } from "@/components/order/status-labels";
import { Tag } from "@/components/product/tag";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireCustomer } from "@/modules/identity";
import { listOrders } from "@/modules/orders";

export const metadata: Metadata = { title: "Your orders" };

export default function OrdersPage() {
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">Your orders</h1>
      <Suspense
        fallback={<Skeleton className="rounded-card mt-6 h-48 max-w-2xl" />}
      >
        <Orders />
      </Suspense>
    </section>
  );
}

async function Orders() {
  const customer = await requireCustomer("/account/orders");
  const orders = await listOrders(customer.id);
  if (orders.length === 0) {
    return (
      <div className="mt-6 grid justify-items-start gap-4">
        <p className="text-muted-foreground">
          No orders yet. Your first one is a few taps away.
        </p>
        <Link href="/" className={PRIMARY_BUTTON}>
          Start shopping
        </Link>
      </div>
    );
  }
  return (
    <ul className="mt-6 grid max-w-2xl gap-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/orders/${order.orderNo}`}
            className="rounded-card border-border bg-card hover:border-border-strong grid gap-1 border p-5"
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <b className="tabular-nums">{order.orderNo}</b>
              <Tag tone={order.status === "cancelled" ? "quiet" : "soft"}>
                {ORDER_STATUS_LABEL[order.status]}
              </Tag>
            </span>
            <span className="text-muted-foreground text-sm">
              Placed {formatDateTime(order.placedAt)}. Delivery{" "}
              {formatSlot(order.slot.startsAt, order.slot.endsAt)}.
            </span>
            <span className="text-sm">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"},{" "}
              <b>{formatMoney(order.totalCents)}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
