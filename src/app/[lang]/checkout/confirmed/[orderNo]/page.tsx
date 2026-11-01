import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { cartContext, readCartOwner } from "@/app/[lang]/cart/owner";
import { CartSync } from "@/components/cart/cart-button";
import { OrderDetails } from "@/components/order/order-details";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { formatMoney } from "@/lib/money";
import { getCart } from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";
import { getOrder } from "@/modules/orders";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getMessages()).confirmed.title,
    robots: { index: false },
  };
}

/** The text with one part of it in bold, such as the cash to have ready. */
function Bold({ text, part }: { text: string; part: string }) {
  const at = text.indexOf(part);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <b>{part}</b>
      {text.slice(at + part.length)}
    </>
  );
}

export default function ConfirmedPage({
  params,
}: PageProps<"/[lang]/checkout/confirmed/[orderNo]">) {
  return (
    <section className="wrap max-w-3xl py-10 md:py-14">
      <Suspense fallback={<Skeleton className="rounded-card h-96" />}>
        <Confirmed params={params} />
      </Suspense>
    </section>
  );
}

async function Confirmed({
  params,
}: Pick<PageProps<"/[lang]/checkout/confirmed/[orderNo]">, "params">) {
  const { orderNo } = await params;
  const lang = await getLang();
  const t = (await getMessages()).confirmed;
  const customer = await requireCustomer(`/checkout/confirmed/${orderNo}`);
  const order = await getOrder(customer.id, orderNo);
  if (!order) notFound();
  // Not paid yet: this page must not say the order is in.
  if (order.status === "pending_payment") {
    redirect(localPath(lang, `/checkout/pay/${order.orderNo}`));
  }
  const estimated = order.lines.some((l) => l.weighed);
  const total = formatMoney(order.totalCents);
  // The header still shows the Cart that became this Order; hand it the new one.
  const owner = await readCartOwner();
  const cart = await getCart(owner, await cartContext(owner));
  return (
    <div className="grid gap-8">
      <CartSync view={cart} />
      <div className="rounded-card bg-accent-soft grid justify-items-start gap-3 p-6 md:p-8">
        <CheckCircleIcon size={40} aria-hidden />
        <h1 className="type-h1">{t.heading}</h1>
        <p>
          {t.number} <b className="tabular-nums">{order.orderNo}</b>.{" "}
          {t.sentTo(Boolean(customer.email))}
        </p>
        {order.paymentMethod === "cod" && (
          <p>
            <Bold
              text={estimated ? t.cashAbout(total) : t.cash(total)}
              part={total}
            />
          </p>
        )}
        {order.paymentStatus === "paid" && (
          <p>
            <Bold
              text={t.paid(
                total,
                order.paymentMethod === "gcash" ? "gcash" : "card"
              )}
              part={total}
            />
          </p>
        )}
        <Link href={`/orders/${order.orderNo}`} className={PRIMARY_BUTTON}>
          {t.track}
        </Link>
      </div>
      <OrderDetails order={order} lang={lang} />
    </div>
  );
}
