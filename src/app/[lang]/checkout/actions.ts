"use server";

import { refresh, updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { STOCK_TAG } from "@/app/_data/storefront";
import { jobHandlers } from "@/server/job-handlers";
import { langOf, localPath, type Lang } from "@/i18n/lang";
import { MESSAGES, type Messages } from "@/i18n/messages";
import { countStep } from "@/lib/funnel";
import { formatMoney } from "@/lib/money";
import { clientIp } from "@/lib/rate-limit";
import { getCartId } from "@/modules/cart";
import { applyReferral, getAddress } from "@/modules/customers";
import { holdSlot, resolveZone } from "@/modules/delivery";
import { requireCustomer } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import {
  abandonPayment,
  getOrder,
  placeOrder,
  type PlaceOrderResult,
} from "@/modules/orders";
import {
  paymentProvider,
  startCheckout,
  type PaymentProvider,
} from "@/modules/payments";

import { REFERRAL_COOKIE } from "../r/referral-cookie";
import { takeOrderAttempt } from "./order-limits";

export type HoldState =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: keyof Messages["checkout"]["hold"] };

/** Hold the chosen Slot for 10 minutes (PRD CHK-2) at the address's Hub. */
export async function holdSlotAction(
  slotId: string,
  addressId: string
): Promise<HoldState> {
  const customer = await requireCustomer("/checkout");
  const [cartId, address] = await Promise.all([
    getCartId({ customerId: customer.id }),
    getAddress(customer.id, addressId),
  ]);
  if (!cartId) return { ok: false, reason: "empty_cart" };
  const zone = address ? await resolveZone(address) : null;
  if (!zone) return { ok: false, reason: "out_of_zone" };
  const result = await holdSlot(cartId, slotId, { hubId: zone.hubId });
  if (result.ok) return { ok: true, expiresAt: result.expiresAt.toISOString() };
  refresh();
  return { ok: false, reason: result.reason === "full" ? "full" : "closed" };
}

export type CheckoutState = {
  message?: string;
  /** What was typed, so the form refills after React resets it. */
  values?: {
    phone: string;
    riderNotes: string;
    slotId: string;
    payment: string;
  };
};

function explain(
  t: Messages,
  result: Exclude<PlaceOrderResult, { ok: true }>
): string {
  const no = t.checkout.refused;
  switch (result.reason) {
    case "total_changed":
      return no.total_changed(formatMoney(result.totalCents));
    case "below_minimum":
      return no.below_minimum(formatMoney(result.shortByCents));
    case "over_cod_limit":
      return no.over_cod_limit(formatMoney(result.limitCents));
    case "too_many_items":
      return no.too_many_items(result.limit);
    case "voucher_unavailable":
      return no.voucher_unavailable(t.cart.notices[result.problem]);
    default:
      return no[result.reason];
  }
}

export async function placeOrderAction(
  _prev: CheckoutState,
  fd: FormData
): Promise<CheckoutState> {
  const customer = await requireCustomer("/checkout");
  const text = (key: string) => String(fd.get(key) ?? "");
  // The page's language, so the answer and the next page match it.
  const lang = langOf(text("lang"));
  const t = MESSAGES[lang];
  const values = {
    phone: text("phone"),
    riderNotes: text("riderNotes"),
    slotId: text("slotId"),
    payment: text("payment"),
  };
  const paymentMethod =
    values.payment === "gcash" || values.payment === "card"
      ? values.payment
      : "cod";
  const provider = paymentMethod === "cod" ? null : paymentProvider();
  if (paymentMethod !== "cod" && !provider) {
    return { message: t.checkout.onlineOff, values };
  }
  if (!(await takeOrderAttempt(customer.id, clientIp(await headers())))) {
    return { message: t.checkout.tooMany, values };
  }
  // A friend's link opened before this first Order (ADR 0015): link them now.
  // A refusal (already linked, not new, own code) changes nothing.
  const jar = await cookies();
  const referral = jar.get(REFERRAL_COOKIE)?.value;
  if (referral) {
    await applyReferral(customer.id, referral);
    jar.delete(REFERRAL_COOKIE);
  }
  const result = await placeOrder({
    customerId: customer.id,
    addressId: text("addressId"),
    slotId: values.slotId,
    contactPhone: values.phone,
    riderNotes: values.riderNotes,
    paymentMethod,
    expectedTotalCents: Number(text("expectedTotalCents")),
    idempotencyKey: text("idempotencyKey"),
  });
  if (result.ok) {
    // Stock just changed: shelves must not keep offering what is reserved.
    updateTag(STOCK_TAG);
    after(() => countStep("order_placed"));
    if (provider) {
      await goToPayment(provider, result.orderId, result.orderNo, lang);
    }
    // Send the confirmation now; the cron run is the safety net.
    after(() => runDueJobs(jobHandlers).then(() => undefined));
    redirect(localPath(lang, `/checkout/confirmed/${result.orderNo}`));
  }
  // Show the Cart, Slots and total as they are now.
  refresh();
  return { message: explain(t, result), values };
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Send the Customer to the hosted checkout for their unpaid Order. Both
 * ways back land on /checkout/pay, which reads the Order and never takes
 * the redirect's word for it.
 */
async function goToPayment(
  provider: PaymentProvider,
  orderId: string,
  orderNo: string,
  lang: Lang
): Promise<never> {
  const page = localPath(lang, `/checkout/pay/${encodeURIComponent(orderNo)}`);
  let url: string | null;
  try {
    url = await startCheckout(provider, {
      orderId,
      orderNo,
      successUrl: new URL(`${page}?back=paid`, appUrl()).toString(),
      cancelUrl: new URL(`${page}?back=cancelled`, appUrl()).toString(),
    });
  } catch (error) {
    console.error(`[checkout] could not open payment for ${orderNo}:`, error);
    redirect(`${page}?back=error`);
  }
  // Null: nothing left to pay. The page shows where the Order stands.
  redirect(url ?? page);
}

/** "Pay now" on /checkout/pay: reopen the Order's hosted checkout. */
export async function payNowAction(
  orderNo: string,
  pageLang: string
): Promise<void> {
  const lang = langOf(pageLang);
  const page = localPath(lang, `/checkout/pay/${encodeURIComponent(orderNo)}`);
  const customer = await requireCustomer(page);
  const order = await getOrder(customer.id, orderNo);
  const provider = paymentProvider();
  if (!order || !provider) redirect(page);
  await goToPayment(provider, order.id, order.orderNo, lang);
}

/**
 * "Back to cart" on /checkout/pay: give up on paying. The Order is
 * cancelled and its items go back in the Cart.
 */
export async function backToCartAction(
  orderNo: string,
  pageLang: string
): Promise<void> {
  const lang = langOf(pageLang);
  const page = localPath(lang, `/checkout/pay/${encodeURIComponent(orderNo)}`);
  const customer = await requireCustomer(page);
  const order = await getOrder(customer.id, orderNo);
  const provider = paymentProvider();
  if (!order || !provider) redirect(page);
  if (!(await abandonPayment(provider, customer.id, order.id))) {
    // Paid, or a payment still going through: the page says which.
    redirect(`${page}?back=busy`);
  }
  updateTag(STOCK_TAG); // the stock is back on the shelf
  redirect(localPath(lang, "/cart"));
}
