import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { cartContext, readCartOwner } from "@/app/cart/owner";
import { CartSync } from "@/components/cart/cart-button";
import { OrderDetails } from "@/components/order/order-details";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { formatMoney } from "@/lib/money";
import { getCart } from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";
import { getOrder } from "@/modules/orders";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

export default function ConfirmedPage({
  params,
}: PageProps<"/checkout/confirmed/[orderNo]">) {
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <Suspense
        fallback={<div className="bg-muted rounded-card h-96 animate-pulse" />}
      >
        <Confirmed params={params} />
      </Suspense>
    </section>
  );
}

async function Confirmed({
  params,
}: Pick<PageProps<"/checkout/confirmed/[orderNo]">, "params">) {
  const { orderNo } = await params;
  const customer = await requireCustomer(`/checkout/confirmed/${orderNo}`);
  const order = await getOrder(customer.id, orderNo);
  if (!order) notFound();
  // The header still shows the Cart that became this Order; hand it the new one.
  const owner = await readCartOwner();
  const cart = await getCart(owner, await cartContext(owner));
  return (
    <div className="grid gap-8">
      <CartSync view={cart} />
      <div className="rounded-card bg-accent-soft grid justify-items-start gap-3 p-6 md:p-8">
        <CheckCircleIcon size={40} aria-hidden />
        <h1 className="type-h1">Salamat! Your order is in.</h1>
        <p>
          Order number <b className="tabular-nums">{order.orderNo}</b>. We sent
          the details to your email and phone.
        </p>
        {order.paymentMethod === "cod" && (
          <p>
            Please have <b>{formatMoney(order.totalCents)}</b> ready in cash for
            the Rider.
          </p>
        )}
        <Link href={`/orders/${order.orderNo}`} className={PRIMARY_BUTTON}>
          Track your order
        </Link>
      </div>
      <OrderDetails order={order} />
    </div>
  );
}
