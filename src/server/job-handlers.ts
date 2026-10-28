import { formatDate, formatSlot, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import { productHref } from "@/lib/routes";
import { signValue } from "@/lib/signed";
import { CART_REMINDER_JOB, getCartReminder } from "@/modules/cart";
import { CLAIM_DECIDED_JOB, getClaimNotice } from "@/modules/claims";
import { getProductSummaries } from "@/modules/catalog";
import { getProfile, rewardReferral } from "@/modules/customers";
import { STOCK_ALERT_JOB } from "@/modules/inventory";
import type { JobHandlers } from "@/modules/jobs";
import {
  sendBackInStock,
  sendCartReminder,
  sendClaimDecided,
  sendReferralReward,
  sendDeliveryFailed,
  sendOrderCancelled,
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
  ORDER_CANCELLED_JOB,
  ORDER_CONFIRMED_JOB,
  ORDER_DELIVERED_JOB,
  OUT_FOR_DELIVERY_JOB,
  SUBSTITUTION_ASKED_JOB,
} from "@/modules/orders";
import { getRefundNotice, REFUND_JOB, sendRefund } from "@/modules/payments";
import { createRewardVoucher, REFERRAL_REWARD_CENTS } from "@/modules/pricing";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const trackingUrl = (orderNo: string) =>
  new URL(`/orders/${orderNo}`, appUrl()).toString();
const link = (path: string) => new URL(path, appUrl()).toString();

// Wires job kinds to modules; modules stay unaware of each other here.
export const jobHandlers: JobHandlers = {
  // A Freshness Claim was decided: tell the Customer how (ADR 0016).
  async [CLAIM_DECIDED_JOB](payload) {
    const claim = await getClaimNotice(String(payload.claimId));
    if (!claim) return;
    const method = claim.order.payments[0]?.method;
    await sendClaimDecided({
      claimId: claim.id,
      email: claim.customer.email,
      phone: claim.order.contactPhone,
      name: claim.customer.name,
      orderNo: claim.order.orderNo,
      product: claim.orderLine.nameSnapshot,
      approved: claim.status === "approved",
      amount: formatMoney(claim.resolvedCents ?? 0),
      refundedTo:
        claim.payback === "refund"
          ? method === "gcash"
            ? "GCash"
            : "your card"
          : null,
      voucher: claim.voucher
        ? { code: claim.voucher.code, until: formatDate(claim.voucher.endsAt) }
        : null,
      note: claim.decisionNote,
      orderUrl: trackingUrl(claim.order.orderNo),
    });
  },

  // An invited friend's first Order arrived: a Voucher each (ADR 0015).
  async [ORDER_DELIVERED_JOB](payload) {
    const order = await getOrderForNotice(String(payload.orderId));
    if (!order || order.status !== "delivered") return;
    const reward = await rewardReferral(order.customerId, order.id, (tx, id) =>
      createRewardVoucher(tx, id)
    );
    if (!reward) return;
    // The friend typed their own name: only letters reach our message, so
    // it cannot carry a link.
    const friend =
      reward.referee.name
        .split(" ")[0]
        .replace(/[^\p{L}'-]/gu, "")
        .slice(0, 20) || "A friend";
    for (const role of ["referrer", "referee"] as const) {
      const who = reward[role];
      await sendReferralReward({
        rewardId: reward.rewardId,
        role,
        email: who.email,
        phone: who.phone,
        name: who.name,
        friend,
        code: who.voucher.code,
        amount: formatMoney(REFERRAL_REWARD_CENTS),
        minSpend: formatMoney(who.voucher.minSpendCents),
        until: formatDate(who.voucher.endsAt),
        shopUrl: link("/"),
      });
    }
  },

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

  async [ORDER_CANCELLED_JOB](payload) {
    const order = await getOrderForNotice(String(payload.orderId));
    if (!order || order.status !== "cancelled") return;
    await sendOrderCancelled({
      orderId: order.id,
      orderNo: order.orderNo,
      email: order.customer.email,
      phone: order.contactPhone,
    });
  },

  // Send the refund, then tell the Customer. A retry after a failed notice
  // sends nothing twice: the refund is already sent, each message once.
  async [REFUND_JOB](payload) {
    const refundId = String(payload.refundId);
    await sendRefund(refundId);
    const refund = await getRefundNotice(refundId);
    if (!refund || refund.status !== "sent" || refund.method === "cod") return;
    // A claim's refund is told in the claim's own message (ADR 0016).
    if (refund.reason === "claim") return;
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
