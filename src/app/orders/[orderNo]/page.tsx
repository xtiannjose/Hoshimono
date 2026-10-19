import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderDetails } from "@/components/order/order-details";
import { OrderTimeline } from "@/components/order/order-timeline";
import { requireCustomer } from "@/modules/identity";
import { getOrder } from "@/modules/orders";

import { cancelOrderAction } from "./actions";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false },
};

export default function TrackingPage({
  params,
}: PageProps<"/orders/[orderNo]">) {
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <Suspense
        fallback={<div className="bg-muted rounded-card h-96 animate-pulse" />}
      >
        <Tracking params={params} />
      </Suspense>
    </section>
  );
}

async function Tracking({
  params,
}: Pick<PageProps<"/orders/[orderNo]">, "params">) {
  const { orderNo } = await params;
  const customer = await requireCustomer(`/orders/${orderNo}`);
  const order = await getOrder(customer.id, orderNo);
  if (!order) notFound();
  const cancellable =
    order.status === "confirmed" || order.status === "pending_payment";
  return (
    <div className="grid gap-8">
      <div>
        <p className="text-muted-foreground text-sm tabular-nums">
          Order {order.orderNo}
        </p>
        <h1 className="type-h1">Track your order</h1>
      </div>
      <OrderTimeline status={order.status} events={order.events} />
      <OrderDetails order={order} />
      {cancellable && (
        <form
          action={cancelOrderAction}
          className="grid justify-items-start gap-2"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="orderNo" value={order.orderNo} />
          <p className="text-muted-foreground text-sm">
            Changed your mind? You can cancel until we start picking.
          </p>
          <button
            type="submit"
            className="rounded-pill border-border-strong hover:bg-muted min-h-11 border px-5 font-semibold"
          >
            Cancel order
          </button>
        </form>
      )}
    </div>
  );
}
