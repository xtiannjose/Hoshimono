import { randomInt } from "node:crypto";

import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { enqueueJob } from "@/modules/jobs";
import { recordCodCollected } from "@/modules/payments";

import { transitionOrder, type Actor } from "./status";

// shortcut: like read.ts, Rider names come from Staff rows through Prisma
// relations, though identity owns them.

/** Job that tells the Customer their Order is on its way, with the PIN. */
export const OUT_FOR_DELIVERY_JOB = "order.out_for_delivery";
/** Job that tells the Customer a delivery failed. */
export const DELIVERY_FAILED_JOB = "order.delivery_failed";
// Wrong PINs a Rider may enter before the Dispatcher must step in (ADR 0011).
const MAX_PIN_TRIES = 5;

/**
 * Send a picked Order out (or out again after a failed try) with a Rider
 * and a new Delivery PIN, and queue the Customer's message (ADR 0011).
 */
export async function dispatchOrder(
  orderId: string,
  riderId: string,
  actor: Actor,
  now = new Date()
): Promise<{ ok: true } | { ok: false; reason: "not_a_rider" | "not_ready" }> {
  const rider = await db.staff.findUnique({
    where: { id: riderId },
    select: { role: true, isActive: true },
  });
  if (rider?.role !== "rider" || !rider.isActive) {
    return { ok: false, reason: "not_a_rider" };
  }
  const sent = await db.$transaction(async (tx) => {
    const moved = await transitionOrder(
      orderId,
      "out_for_delivery",
      actor,
      undefined,
      { from: ["picked", "delivery_failed"], client: tx }
    );
    if (!moved) return false;
    await tx.order.update({
      where: { id: orderId },
      data: {
        riderId,
        deliveryPin: String(randomInt(0, 10_000)).padStart(4, "0"),
        pinAttempts: 0,
        dispatchedAt: now,
      },
    });
    await enqueueJob(tx, OUT_FOR_DELIVERY_JOB, {
      orderId,
      dispatchedAt: now.toISOString(),
    });
    return true;
  });
  return sent ? { ok: true } : { ok: false, reason: "not_ready" };
}

type DeliveryErrors = {
  pin?: string;
  cash?: string;
  note?: string;
  reason?: string;
  form?: string;
};
type DeliveryResult = { ok: true } | { ok: false; errors: DeliveryErrors };

/** Delivered: record the cash for a cash-on-delivery Order, in one go. */
async function deliver(
  order: { id: string; dueCents: number; cod: boolean },
  actor: Actor,
  reason: string | undefined,
  { cashCents, note }: { cashCents?: number; note?: string }
): Promise<DeliveryResult> {
  const why = note?.trim() || null;
  if (order.cod) {
    if (!Number.isInteger(cashCents) || cashCents! < 0) {
      return { ok: false, errors: { cash: "Enter the cash you received." } };
    }
    if (cashCents !== order.dueCents && !why) {
      return {
        ok: false,
        errors: { note: "Say why the cash is different from what is due." },
      };
    }
  }
  const done = await db.$transaction(async (tx) => {
    const moved = await transitionOrder(order.id, "delivered", actor, reason, {
      from: ["out_for_delivery"],
      client: tx,
    });
    if (!moved) return false;
    if (order.cod) {
      await recordCodCollected(tx, order.id, cashCents!, why);
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "cod_collected" },
      });
    }
    return true;
  });
  return done
    ? { ok: true }
    : { ok: false, errors: { form: "This Order is not out for delivery." } };
}

async function outForDelivery(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      riderId: true,
      deliveryPin: true,
      pinAttempts: true,
      totalCents: true,
      finalTotalCents: true,
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { method: true },
      },
    },
  });
  if (!order || order.status !== "out_for_delivery") return null;
  return {
    ...order,
    dueCents: order.finalTotalCents ?? order.totalCents,
    cod: order.payments[0]?.method === "cod",
  };
}

/**
 * The Rider at the door: the Customer's Delivery PIN proves it, and a
 * cash-on-delivery Order records the cash taken (ADR 0011).
 */
export async function completeDelivery(
  orderId: string,
  riderId: string,
  input: { pin: string; cashCents?: number; note?: string }
): Promise<DeliveryResult> {
  const order = await outForDelivery(orderId);
  if (!order || order.riderId !== riderId) {
    return { ok: false, errors: { form: "This Order is not one of yours." } };
  }
  if (order.pinAttempts >= MAX_PIN_TRIES) {
    return {
      ok: false,
      errors: { pin: "Too many tries. Call the Dispatcher." },
    };
  }
  if (input.pin.trim() !== order.deliveryPin) {
    const { pinAttempts } = await db.order.update({
      where: { id: orderId },
      data: { pinAttempts: { increment: 1 } },
      select: { pinAttempts: true },
    });
    const left = MAX_PIN_TRIES - pinAttempts;
    return {
      ok: false,
      errors: {
        pin:
          left > 0
            ? `That PIN is not right. ${left} ${left === 1 ? "try" : "tries"} left.`
            : "Too many tries. Call the Dispatcher.",
      },
    };
  }
  return deliver(order, { type: "staff", id: riderId }, undefined, input);
}

/** The Dispatcher marks it delivered without the PIN, saying why. */
export async function deliverWithoutPin(
  orderId: string,
  actor: Actor,
  reason: string,
  cash: { cashCents?: number; note?: string }
): Promise<DeliveryResult> {
  const why = reason.trim();
  if (!why) {
    return { ok: false, errors: { reason: "Say why the PIN was not used." } };
  }
  const order = await outForDelivery(orderId);
  if (!order) {
    return {
      ok: false,
      errors: { form: "This Order is not out for delivery." },
    };
  }
  return deliver(order, actor, `Without PIN: ${why}`, cash);
}

/** The Rider could not deliver; the Dispatcher sends it again or cancels. */
export async function failDelivery(
  orderId: string,
  riderId: string,
  reason: string
): Promise<DeliveryResult> {
  const why = reason.trim();
  if (!why) {
    return {
      ok: false,
      errors: { reason: "Say why it could not be delivered." },
    };
  }
  const order = await outForDelivery(orderId);
  if (!order || order.riderId !== riderId) {
    return { ok: false, errors: { form: "This Order is not one of yours." } };
  }
  const failed = await db.$transaction(async (tx) => {
    const moved = await transitionOrder(
      orderId,
      "delivery_failed",
      { type: "staff", id: riderId },
      why,
      { from: ["out_for_delivery"], client: tx }
    );
    if (moved) {
      await enqueueJob(tx, DELIVERY_FAILED_JOB, {
        orderId,
        at: new Date().toISOString(),
      });
    }
    return moved;
  });
  return failed
    ? { ok: true }
    : { ok: false, errors: { form: "This Order is not out for delivery." } };
}

export type DeliveryStop = {
  id: string;
  orderNo: string;
  slot: { startsAt: Date; endsAt: Date };
  customerName: string;
  contactPhone: string;
  riderNotes: string | null;
  address: {
    label: string;
    line1: string;
    barangay: string;
    city: string;
    landmark: string;
  };
  /** Cash to collect; 0 when paid online. */
  dueCents: number;
};

/** The Orders a Rider is carrying, by Slot time. */
export async function listDeliveriesForRider(
  riderId: string
): Promise<DeliveryStop[]> {
  const orders = await db.order.findMany({
    where: { riderId, status: "out_for_delivery" },
    orderBy: { slot: { startsAt: "asc" } },
    select: {
      id: true,
      orderNo: true,
      contactPhone: true,
      riderNotes: true,
      addressSnapshot: true,
      totalCents: true,
      finalTotalCents: true,
      slot: { select: { startsAt: true, endsAt: true } },
      customer: { select: { name: true } },
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { method: true },
      },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    slot: o.slot,
    customerName: o.customer.name ?? "",
    contactPhone: o.contactPhone,
    riderNotes: o.riderNotes,
    address: o.addressSnapshot as DeliveryStop["address"],
    dueCents:
      o.payments[0]?.method === "cod" ? (o.finalTotalCents ?? o.totalCents) : 0,
  }));
}

export type BoardRow = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  slot: { startsAt: Date; endsAt: Date };
  customerName: string;
  barangay: string;
  riderName: string | null;
  /** Cash due for a cash-on-delivery Order; null when paid online. */
  dueCents: number | null;
};

/** The dispatch board: Orders ready, out, or back after a failed try. */
export async function listDispatchBoard(): Promise<BoardRow[]> {
  const orders = await db.order.findMany({
    where: {
      status: { in: ["picked", "out_for_delivery", "delivery_failed"] },
    },
    orderBy: [{ slot: { startsAt: "asc" } }, { placedAt: "asc" }],
    take: 200,
    select: {
      id: true,
      orderNo: true,
      status: true,
      addressSnapshot: true,
      totalCents: true,
      finalTotalCents: true,
      slot: { select: { startsAt: true, endsAt: true } },
      customer: { select: { name: true } },
      rider: { select: { name: true } },
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { method: true },
      },
    },
  });
  return orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    status: o.status,
    slot: o.slot,
    customerName: o.customer.name ?? "",
    barangay: (o.addressSnapshot as { barangay?: string }).barangay ?? "",
    riderName: o.rider?.name ?? null,
    dueCents:
      o.payments[0]?.method === "cod"
        ? (o.finalTotalCents ?? o.totalCents)
        : null,
  }));
}

/** What the Customer's message needs once the Order is out (system use). */
export async function getDeliveryNotice(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      contactPhone: true,
      deliveryPin: true,
      totalCents: true,
      finalTotalCents: true,
      customer: { select: { email: true } },
      rider: { select: { name: true, phone: true } },
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { method: true },
      },
    },
  });
  if (!order) return null;
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    status: order.status,
    email: order.customer.email,
    phone: order.contactPhone,
    pin: order.deliveryPin,
    riderName: order.rider?.name ?? null,
    riderPhone: order.rider?.phone ?? null,
    cashDueCents:
      order.payments[0]?.method === "cod"
        ? (order.finalTotalCents ?? order.totalCents)
        : null,
  };
}
