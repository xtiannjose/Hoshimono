import {
  CreditCardIcon,
  DeviceMobileIcon,
  HourglassMediumIcon,
  ShoppingCartIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { backToCartAction, payNowAction } from "@/app/checkout/actions";
import {
  PaymentWatch,
  PendingButton,
} from "@/components/checkout/payment-status";
import { OrderDetails } from "@/components/order/order-details";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { addMinutes, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireCustomer } from "@/modules/identity";
import { getOrder, PAYMENT_WINDOW_MINUTES } from "@/modules/orders";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false },
};

const PANEL =
  "rounded-card border-border bg-card grid justify-items-start gap-3 border p-6 md:p-8";

export default function PayPage({
  params,
  searchParams,
}: PageProps<"/checkout/pay/[orderNo]">) {
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="rounded-card h-96" />}>
        <Pay params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/**
 * Where the Customer lands from the hosted checkout, paid or not. The Order
 * decides what shows; the `back` hint from the redirect only picks words.
 */
async function Pay({
  params,
  searchParams,
}: PageProps<"/checkout/pay/[orderNo]">) {
  const { orderNo } = await params;
  const { back } = await searchParams;
  const customer = await requireCustomer(`/checkout/pay/${orderNo}`);
  const order = await getOrder(customer.id, orderNo);
  if (!order) notFound();

  if (order.status === "cancelled") {
    return (
      <div className={PANEL}>
        <ShoppingCartIcon size={40} aria-hidden />
        <h1 className="type-h1">This order was cancelled</h1>
        <p>
          Order <b className="tabular-nums">{order.orderNo}</b> was cancelled,
          so there is nothing to pay.
        </p>
        <Link href="/cart" className={PRIMARY_BUTTON}>
          Go to your cart
        </Link>
      </div>
    );
  }
  // Paid: the webhook confirmed it.
  if (order.status !== "pending_payment") {
    redirect(`/checkout/confirmed/${order.orderNo}`);
  }

  const total = formatMoney(order.totalCents);
  const by = order.paymentMethod === "card" ? "your card" : "GCash";
  const watching = back === "paid" || back === "busy";
  const say =
    back === "paid"
      ? {
          title: "Checking your payment",
          body: `We're waiting for ${by} to confirm ${total}. This usually takes a few seconds, and this page updates by itself.`,
        }
      : back === "busy"
        ? {
            title: "Your payment is still going through",
            body: `We'll confirm your order as soon as ${by} does. This page updates by itself.`,
          }
        : back === "cancelled"
          ? {
              title: "Your payment did not go through",
              body: "You can try again, or go back to your cart to change something.",
            }
          : back === "error"
            ? {
                title: "We could not open the payment page",
                body: "Please try again in a moment.",
              }
            : {
                title: "Pay to confirm your order",
                body: `Your order is waiting for ${total}.`,
              };
  const Icon = watching
    ? HourglassMediumIcon
    : back === "cancelled" || back === "error"
      ? WarningCircleIcon
      : order.paymentMethod === "card"
        ? CreditCardIcon
        : DeviceMobileIcon;
  const heldUntil = formatTime(
    addMinutes(order.placedAt, PAYMENT_WINDOW_MINUTES)
  );

  return (
    <div className="grid gap-8">
      <PaymentWatch />
      <div className={PANEL}>
        <Icon
          size={40}
          aria-hidden
          className={watching ? undefined : "text-warn"}
        />
        <p className="text-muted-foreground text-sm tabular-nums">
          Order {order.orderNo}
        </p>
        <h1 className="type-h1">{say.title}</h1>
        <p className="max-w-[60ch]">{say.body}</p>
        {!watching && (
          <p className="max-w-[60ch]">
            We&apos;re holding your items and delivery slot until{" "}
            <b className="tabular-nums">{heldUntil}</b>.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          <form action={payNowAction.bind(null, order.orderNo)}>
            <PendingButton
              variant={watching ? "secondary" : "default"}
              pendingLabel="Opening payment page..."
            >
              Pay {total} now
            </PendingButton>
          </form>
          <form action={backToCartAction.bind(null, order.orderNo)}>
            <PendingButton variant="secondary" pendingLabel="Going back...">
              Back to cart
            </PendingButton>
          </form>
        </div>
      </div>
      <OrderDetails order={order} />
    </div>
  );
}
