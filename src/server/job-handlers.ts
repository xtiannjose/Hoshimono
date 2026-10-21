import { formatSlot, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import { productHref } from "@/lib/routes";
import { signValue } from "@/lib/signed";
import { CART_REMINDER_JOB, getCartReminder } from "@/modules/cart";
import { getProductSummaries } from "@/modules/catalog";
import { getProfile } from "@/modules/customers";
import { STOCK_ALERT_JOB } from "@/modules/inventory";
import type { JobHandlers } from "@/modules/jobs";
import {
  sendBackInStock,
  sendCartReminder,
  sendDeliveryFailed,
  sendOrderConfirmed,
  sendOutForDelivery,
  sendRefundIssued,
  sendSubstitutionAsked,
} from "@/modules/notifications";
import {
  DELIVERY_FAILED_JOB,
  getDeliveryNotice,
  getOrderForNotice,
  getSubstitution,
  ORDER_CONFIRMED_JOB,
  OUT_FOR_DELIVERY_JOB,
  SUBSTITUTION_ASKED_JOB,
} from "@/modules/orders";
import { getRefundNotice, REFUND_JOB, sendRefund } from "@/modules/payments";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const trackingUrl = (orderNo: string) =>
  new URL(`/orders/${orderNo}`, appUrl()).toString();
const link = (path: string) => new URL(path, appUrl()).toString();

// Wires job kinds to modules; modules stay unaware of each other here.
export const jobHandlers: JobHandlers = {
  // The one Cart Reminder (ADR 0014): skipped if they ordered, emptied the
  // Cart or said no to reminders since it was queued.
  async [CART_REMINDER_JOB](payload) {
    const cartId = String(payload.cartId);
    const reminder = await getCartReminder(cartId);
    if (!reminder) return;
    await sendCartReminder({
      cartId,
      email: reminder.email,
      name: reminder.name,
      items: reminder.items,
      cartUrl: link("/cart"),
      stopUrl: link(`/stop/${signValue(reminder.customerId)}`),
    });
  },

  // A Stock Alert came due: the Product is back (ADR 0014).
  async [STOCK_ALERT_JOB](payload) {
    const [profile, [product]] = await Promise.all([
      getProfile(String(payload.customerId)),
      getProductSummaries([String(payload.productId)]),
    ]);
    if (!profile || !product) return;
    await sendBackInStock({
      alertId: String(payload.alertId),
      email: profile.email,
      phone: profile.phone,
      product: productName(product),
      productUrl: link(productHref(product)),
    });
  },

  async [ORDER_CONFIRMED_JOB](payload) {
    const order = await getOrderForNotice(String(payload.orderId));
    // Cancelled before the job ran: a "confirmed" message would mislead.
    if (!order || order.status === "cancelled") return;
    await sendOrderConfirmed({
      orderId: order.id,
      orderNo: order.orderNo,
      email: order.customer.email,
      phone: order.contactPhone,
      slot: formatSlot(order.slot.startsAt, order.slot.endsAt),
      total: formatMoney(order.totalCents),
      trackingUrl: trackingUrl(order.orderNo),
      lines: order.lines.map((l) => ({
        name: l.nameSnapshot,
        quantity: l.orderedQty,
      })),
      cashOnDelivery: order.payments[0]?.method === "cod",
      estimated: order.lines.some((l) => l.orderedWeightGrams !== null),
    });
  },

  // Ask the Customer about a swap while its window is open (ADR 0010).
  async [SUBSTITUTION_ASKED_JOB](payload) {
    const sub = await getSubstitution({ id: String(payload.substitutionId) });
    if (!sub?.token || !sub.windowEndsAt || sub.answer !== "waiting") return;
    if (sub.windowEndsAt <= new Date()) return;
    await sendSubstitutionAsked({
      orderId: sub.orderId,
      orderNo: sub.orderNo,
      substitutionId: sub.id,
      email: sub.email,
      phone: sub.phone,
      ordered: sub.ordered.name,
      substitute: sub.substitute.name,
      quantity: sub.substitute.quantity,
      unitPrice: formatMoney(sub.substitute.unitPriceCents),
      until: formatTime(sub.windowEndsAt),
      link: new URL(`/s/${sub.token}`, appUrl()).toString(),
    });
  },

  // The Order left the Hub: who is coming and the Delivery PIN (ADR 0011).
  async [OUT_FOR_DELIVERY_JOB](payload) {
    const d = await getDeliveryNotice(String(payload.orderId));
    // Delivered or back already: an "on its way" message would mislead.
    if (!d || d.status !== "out_for_delivery" || !d.pin || !d.riderName) return;
    await sendOutForDelivery({
      orderId: d.orderId,
      orderNo: d.orderNo,
      email: d.email,
      phone: d.phone,
      trip: String(payload.dispatchedAt),
      riderName: d.riderName,
      riderPhone: d.riderPhone,
      pin: d.pin,
      cashDue: d.cashDueCents === null ? null : formatMoney(d.cashDueCents),
      trackingUrl: trackingUrl(d.orderNo),
    });
  },

  async [DELIVERY_FAILED_JOB](payload) {
    const d = await getDeliveryNotice(String(payload.orderId));
    if (!d) return;
    await sendDeliveryFailed({
      orderId: d.orderId,
      orderNo: d.orderNo,
      email: d.email,
      phone: d.phone,
      trip: String(payload.at),
    });
  },

  // Send the refund, then tell the Customer. A retry after a failed notice
  // sends nothing twice: the refund is already sent, each message once.
  async [REFUND_JOB](payload) {
    const refundId = String(payload.refundId);
    await sendRefund(refundId);
    const refund = await getRefundNotice(refundId);
    if (!refund || refund.status !== "sent" || refund.method === "cod") return;
    const order = await getOrderForNotice(refund.orderId);
    if (!order) return;
    await sendRefundIssued({
      orderId: order.id,
      orderNo: order.orderNo,
      email: order.customer.email,
      phone: order.contactPhone,
      amount: formatMoney(refund.amountCents),
      method: refund.method,
      reason: refund.reason,
      trackingUrl: trackingUrl(order.orderNo),
    });
  },
};
