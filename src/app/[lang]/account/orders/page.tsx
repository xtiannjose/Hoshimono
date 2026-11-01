import type { Metadata } from "next";
import Link from "@/components/link";
import { Suspense } from "react";

import { Tag } from "@/components/product/tag";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { getLang, getMessages } from "@/i18n/server";
import { formatDateTime, formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireCustomer } from "@/modules/identity";
import { listOrders } from "@/modules/orders";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).history.title };
}

export default async function OrdersPage() {
  const t = (await getMessages()).history;
  return (
    <section className="wrap py-10 md:py-14">
      <h1 className="type-h1">{t.title}</h1>
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
  const lang = await getLang();
  const m = await getMessages();
  const t = m.history;
  if (orders.length === 0) {
    return (
      <div className="mt-6 grid justify-items-start gap-4">
        <p className="text-muted-foreground">{t.none}</p>
        <Link href="/" className={PRIMARY_BUTTON}>
          {t.startShopping}
        </Link>
      </div>
    );
  }
  const now = new Date();
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
                {t.status[order.status]}
              </Tag>
            </span>
            <span className="text-muted-foreground text-sm">
              {t.placed(
                formatDateTime(order.placedAt, lang),
                formatSlot(order.slot.startsAt, order.slot.endsAt, now, lang)
              )}
            </span>
            <span className="text-sm">
              {order.itemCount} {m.items(order.itemCount)},{" "}
              <b>{formatMoney(order.totalCents)}</b>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
