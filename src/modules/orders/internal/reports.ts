import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { chargedLine, receiptBreakdown } from "@/modules/pricing";

// The delivery receipt and the daily report (ADR 0012). shortcut: like
// read.ts, they read Customer, Payment and Product rows through relations.

const lineSelect = {
  nameSnapshot: true,
  taxClass: true,
  unitPriceCents: true,
  lineTotalCents: true,
  orderedQty: true,
  fulfilledQty: true,
  orderedWeightGrams: true,
  finalWeightGrams: true,
  status: true,
  substitutions: {
    take: 1,
    select: {
      quantity: true,
      priceCents: true,
      customerResponse: true,
      substituteProduct: { select: { name: true, brand: true } },
    },
  },
} as const;

/** One delivery receipt: what was charged per line, totals and VAT. */
export async function getReceipt(orderNo: string) {
  const order = await db.order.findUnique({
    where: { orderNo },
    select: {
      orderNo: true,
      status: true,
      placedAt: true,
      deliveredAt: true,
      addressSnapshot: true,
      deliveryFeeCents: true,
      discountCents: true,
      totalCents: true,
      finalTotalCents: true,
      paymentStatus: true,
      customer: { select: { name: true } },
      hub: { select: { name: true, address: true } },
      lines: { orderBy: { createdAt: "asc" }, select: lineSelect },
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { method: true },
      },
    },
  });
  if (!order) return null;
  const lines = order.lines.map((l) => {
    const [sub] = l.substitutions;
    const base = {
      lineTotalCents: l.lineTotalCents,
      orderedQty: l.orderedQty,
      fulfilledQty: l.fulfilledQty,
      orderedWeightGrams: l.orderedWeightGrams,
      finalWeightGrams: l.finalWeightGrams,
    };
    const found = chargedLine(base);
    const charged = chargedLine({
      ...base,
      substitute: sub
        ? {
            quantity: sub.quantity,
            unitPriceCents: sub.priceCents,
            accepted: sub.customerResponse !== "rejected",
          }
        : null,
    });
    const weighed = l.orderedWeightGrams !== null;
    const pieces = Math.min(l.fulfilledQty ?? l.orderedQty, l.orderedQty);
    return {
      name: l.nameSnapshot,
      taxClass: l.taxClass,
      detail: weighed
        ? `${l.finalWeightGrams ?? l.orderedWeightGrams} g`
        : `${pieces} x ${formatMoney(l.unitPriceCents)}`,
      amountCents: found,
      substitute:
        sub && charged > found
          ? {
              name: sub.substituteProduct.brand
                ? `${sub.substituteProduct.brand} ${sub.substituteProduct.name}`
                : sub.substituteProduct.name,
              quantity: sub.quantity,
              amountCents: charged - found,
            }
          : null,
    };
  });
  // ponytail: a substitute is taxed as the ordered Product's class; the same
  // Category almost always shares it. Snapshot its class if that ever differs.
  const breakdown = receiptBreakdown(
    lines.flatMap((l) => [
      { amountCents: l.amountCents, taxClass: l.taxClass },
      ...(l.substitute
        ? [{ amountCents: l.substitute.amountCents, taxClass: l.taxClass }]
        : []),
    ]),
    {
      deliveryFeeCents: order.deliveryFeeCents,
      discountCents: order.discountCents,
    }
  );
  return {
    orderNo: order.orderNo,
    status: order.status as OrderStatus,
    placedAt: order.placedAt,
    deliveredAt: order.deliveredAt,
    hub: order.hub,
    customerName: order.customer.name ?? "",
    address: order.addressSnapshot as {
      label: string;
      line1: string;
      barangay: string;
      city: string;
    },
    paymentMethod: (order.payments[0]?.method ?? null) as PaymentMethod | null,
    paymentStatus: order.paymentStatus as PaymentStatus,
    /** Picked: the amounts are final, not the checkout estimate. */
    final: order.finalTotalCents !== null,
    lines,
    deliveryFeeCents: order.deliveryFeeCents,
    discountCents: order.discountCents,
    totalCents: breakdown.totalCents,
    breakdown,
  };
}

/** A Manila date's 24 hours. */
function manilaDay(day: string) {
  const start = new Date(`${day}T00:00:00+08:00`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * The day's numbers (PRD ADM-10, ADR 0012) for a Manila date: Orders
 * placed, delivered and cancelled; revenue (delivered Final Totals);
 * average basket; fill rate and Substitution rate over the delivered lines;
 * late deliveries (after their Slot ended).
 */
export async function dailyReport(day: string) {
  const range = manilaDay(day);
  const [placed, cancelled, delivered] = await Promise.all([
    db.order.count({ where: { placedAt: range } }),
    db.order.count({ where: { status: "cancelled", cancelledAt: range } }),
    db.order.findMany({
      where: { status: "delivered", deliveredAt: range },
      select: {
        totalCents: true,
        finalTotalCents: true,
        deliveredAt: true,
        slot: { select: { endsAt: true } },
        lines: {
          select: {
            status: true,
            substitutions: { take: 1, select: { customerResponse: true } },
          },
        },
      },
    }),
  ]);
  const revenueCents = delivered.reduce(
    (sum, o) => sum + (o.finalTotalCents ?? o.totalCents),
    0
  );
  const lines = delivered.flatMap((o) => o.lines);
  const substituted = lines.filter(
    (l) =>
      l.status === "substituted" &&
      l.substitutions[0]?.customerResponse !== "rejected"
  ).length;
  const filled =
    lines.filter((l) => l.status === "picked").length + substituted;
  return {
    day,
    placed,
    delivered: delivered.length,
    cancelled,
    revenueCents,
    averageBasketCents: delivered.length
      ? Math.round(revenueCents / delivered.length)
      : 0,
    /** Share of delivered lines delivered as ordered or with an accepted swap. */
    fillRate: lines.length ? filled / lines.length : null,
    substitutionRate: lines.length ? substituted / lines.length : null,
    lateDeliveries: delivered.filter((o) => o.deliveredAt! > o.slot.endsAt)
      .length,
  };
}
