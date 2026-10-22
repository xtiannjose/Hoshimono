import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import Link from "next/link";

import { FillCartButton } from "@/components/cart/fill-cart-button";
import { OrderDetails } from "@/components/order/order-details";
import { OrderTimeline } from "@/components/order/order-timeline";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { requireCustomer } from "@/modules/identity";
import { getOrder } from "@/modules/orders";
import { Skeleton } from "@/components/ui/skeleton";

import { cancelOrderAction, reorderAction } from "./actions";
import { OrderClaims } from "./order-claims";

export const metadata: Metadata = {
  title: "Track your order",
  robots: { index: false },
};

export default function TrackingPage({
  params,
}: PageProps<"/orders/[orderNo]">) {
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="rounded-card h-96" />}>
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
      {order.delivery && (
        <section
          aria-labelledby="h-on-the-way"
          className="rounded-card bg-accent-soft grid gap-2 p-5"
        >
          <h2 id="h-on-the-way" className="type-h3">
            On its way with {order.delivery.riderName}
          </h2>
          {order.delivery.riderPhone && (
            <a
              href={`tel:${order.delivery.riderPhone}`}
              className="font-semibold underline underline-offset-4"
            >
              Call {order.delivery.riderPhone}
            </a>
          )}
          {order.delivery.pin && (
            <p>
              Give the Rider this PIN at the door:{" "}
              <b className="font-mono text-2xl tracking-[0.2em]">
                {order.delivery.pin}
              </b>
            </p>
          )}
        </section>
      )}
      {order.status === "pending_payment" && (
        <Link
          href={`/checkout/pay/${order.orderNo}`}
          className={`${PRIMARY_BUTTON} justify-self-start`}
        >
          Finish paying
        </Link>
      )}
      <OrderDetails order={order} />
      <OrderClaims
        orderId={order.id}
        orderNo={order.orderNo}
        customerId={customer.id}
      />
      <FillCartButton
        fill={reorderAction.bind(null, order.orderNo)}
        label="Reorder these items"
        variant="secondary"
      />
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
