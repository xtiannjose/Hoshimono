import {
  CreditCardIcon,
  DeviceMobileIcon,
  HourglassMediumIcon,
  ShoppingCartIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { backToCartAction, payNowAction } from "@/app/[lang]/checkout/actions";
import {
  PaymentWatch,
  PendingButton,
} from "@/components/checkout/payment-status";
import { OrderDetails } from "@/components/order/order-details";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { addMinutes, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { requireCustomer } from "@/modules/identity";
import { getOrder, PAYMENT_WINDOW_MINUTES } from "@/modules/orders";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).pay.title, robots: { index: false } };
}

const PANEL =
  "rounded-card border-border bg-card grid justify-items-start gap-3 border p-6 md:p-8";

export default function PayPage({
  params,
  searchParams,
}: PageProps<"/[lang]/checkout/pay/[orderNo]">) {
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
}: PageProps<"/[lang]/checkout/pay/[orderNo]">) {
  const { orderNo } = await params;
  const { back } = await searchParams;
  const lang = await getLang();
  const words = await getMessages();
  const t = words.pay;
  const customer = await requireCustomer(`/checkout/pay/${orderNo}`);
  const order = await getOrder(customer.id, orderNo);
  if (!order) notFound();

  if (order.status === "cancelled") {
    return (
      <div className={PANEL}>
        <ShoppingCartIcon size={40} aria-hidden />
        <h1 className="type-h1">{t.cancelledTitle}</h1>
        <p>{t.cancelledBody(order.orderNo)}</p>
        <Link href="/cart" className={PRIMARY_BUTTON}>
          {t.goToCart}
        </Link>
      </div>
    );
  }
  // Paid: the webhook confirmed it.
  if (order.status !== "pending_payment") {
    redirect(localPath(lang, `/checkout/confirmed/${order.orderNo}`));
  }

  const total = formatMoney(order.totalCents);
  const by = t.by[order.paymentMethod === "card" ? "card" : "gcash"];
  const watching = back === "paid" || back === "busy";
  const say =
    back === "paid"
      ? { title: t.paidTitle, body: t.paidBody(by, total) }
      : back === "busy"
        ? { title: t.busyTitle, body: t.busyBody(by) }
        : back === "cancelled"
          ? { title: t.cancelledBackTitle, body: t.cancelledBackBody }
          : back === "error"
            ? { title: t.errorTitle, body: t.errorBody }
            : { title: t.waitingTitle, body: t.waitingBody(total) };
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
          {t.order(order.orderNo)}
        </p>
        <h1 className="type-h1">{say.title}</h1>
        <p className="max-w-[60ch]">{say.body}</p>
        {!watching && (
          <p className="max-w-[60ch]">
            {t.holding} <b className="tabular-nums">{heldUntil}</b>.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          <form action={payNowAction.bind(null, order.orderNo, lang)}>
            <PendingButton
              variant={watching ? "secondary" : "default"}
              pendingLabel={words.checkout.opening}
            >
              {t.payNow(total)}
            </PendingButton>
          </form>
          <form action={backToCartAction.bind(null, order.orderNo, lang)}>
            <PendingButton variant="secondary" pendingLabel={t.goingBack}>
              {t.backToCart}
            </PendingButton>
          </form>
        </div>
      </div>
      <OrderDetails order={order} lang={lang} />
    </div>
  );
}
