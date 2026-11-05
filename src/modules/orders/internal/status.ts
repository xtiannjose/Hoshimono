import type { Prisma } from "@/generated/prisma/client";
import type { ActorType, OrderStatus } from "@/generated/prisma/enums";
import { addMinutes } from "@/lib/dates";
import { db, inTransaction, retryConflicts, type Client } from "@/lib/db";
import { returnLinesToCart } from "@/modules/cart";
import { releaseSlot } from "@/modules/delivery";
import {
  pickStock,
  releaseStock,
  returnStock,
  type PickedStock,
} from "@/modules/inventory";
import { enqueueJob } from "@/modules/jobs";
import {
  closeOnlinePayment,
  failUnpaidPayment,
  refundOrderPayment,
  voidCodPayment,
  type PaymentProvider,
} from "@/modules/payments";
import { priceFinal } from "@/modules/pricing";

/** The Order lifecycle (docs/03-ARCHITECTURE.md section 7). */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["picking", "cancelled"],
  picking: ["picked", "cancelled"],
  // Cancelling a packed Order puts what was picked back on the shelf.
  picked: ["out_for_delivery", "cancelled"],
  // Cancelling on the way: the Rider brings it back (ADR 0022).
  out_for_delivery: ["delivered", "delivery_failed", "cancelled"],
  delivery_failed: ["out_for_delivery", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** Where an Order may go next from `status` (the lifecycle above). */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return [...NEXT[status]];
}

/** Statuses an Order can still leave, so it still holds stock or a Slot place. */
export const OPEN_STATUSES = (Object.keys(NEXT) as OrderStatus[]).filter(
  (status) => NEXT[status].length > 0
);

/** Job that sends the order confirmed email and SMS. */
export const ORDER_CONFIRMED_JOB = "order.confirmed";

/** Job run once an Order is delivered, such as a Referral reward (ADR 0015). */
export const ORDER_DELIVERED_JOB = "order.delivered";

/** Job that tells the Customer staff cancelled their Order. */
export const ORDER_CANCELLED_JOB = "order.cancelled";

export type Actor = { type: ActorType; id?: string | null };

/**
 * The only way an Order changes status: checks the lifecycle under a row
 * lock, writes the history row, and on cancel gives back the reserved
 * stock and the Slot place. False when the move is not allowed.
 */
export async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: Actor,
  reason?: string,
  options: { from?: OrderStatus[]; client?: Client } = {}
): Promise<boolean> {
  const run = () =>
    inTransaction(
      options.client ?? db,
      async (tx) => {
        const [order] = await tx.$queryRaw<
          { status: OrderStatus; hub_id: string; slot_id: string }[]
        >`SELECT status, hub_id, slot_id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
        if (!order || !NEXT[order.status].includes(to)) return false;
        if (options.from && !options.from.includes(order.status)) return false;

        const now = new Date();
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: to,
            cancelledAt: to === "cancelled" ? now : undefined,
            deliveredAt: to === "delivered" ? now : undefined,
          },
        });
        await tx.orderStatusEvent.create({
          data: {
            orderId,
            from: order.status,
            to,
            actorType: actor.type,
            actorId: actor.id ?? null,
            reason: reason ?? null,
            at: now,
          },
        });
        if (to === "cancelled") {
          // The Customer cancelled it, or watched it expire; staff say so,
          // queued before any refund so the messages arrive in that order.
          if (actor.type === "staff") {
            await enqueueJob(tx, ORDER_CANCELLED_JOB, { orderId });
          }
          // Slot first, then stock: the order placeOrder locks them in, so a
          // cancel and a checkout cannot deadlock.
          await releaseSlot(tx, order.slot_id);
          if (AFTER_PICK.includes(order.status)) {
            // Already off the shelf count: what was taken goes back (ADR 0012).
            await returnStock(tx, {
              hubId: order.hub_id,
              orderId,
              lines: (await stockTaken(tx, orderId)).map((l) => ({
                productId: l.productId,
                quantity: l.taken,
              })),
            });
          } else {
            const lines = await tx.orderLine.findMany({
              where: { orderId },
              select: { productId: true, orderedQty: true },
            });
            await releaseStock(tx, {
              hubId: order.hub_id,
              orderId,
              lines: lines.map((l) => ({
                productId: l.productId,
                quantity: l.orderedQty,
              })),
            });
          }
          if (await voidCodPayment(tx, orderId)) {
            await tx.order.update({
              where: { id: orderId },
              data: { paymentStatus: "unpaid" },
            });
          } else if ((await refundOrderPayment(tx, orderId, "cancelled")) > 0) {
            // Paid online: everything still held goes back (ADR 0008).
            await tx.order.update({
              where: { id: orderId },
              data: { paymentStatus: "refunded" },
            });
          }
        }
        if (to === "picked") await settlePicked(tx, orderId);
        if (to === "delivered")
          await enqueueJob(tx, ORDER_DELIVERED_JOB, { orderId });
        return true;
      },
      // Cancel and pick lock stock rows that checkouts also lock: placeOrder's
      // 15-second budget, not the 5-second default (ADR 0012).
      { timeout: 15_000 }
    );
  // Its own transaction may lose a deadlock to a checkout or another pick
  // on the same stock: nothing was saved, so it runs again. Inside a
  // caller's transaction, the caller decides.
  return options.client ? run() : retryConflicts(run);
}

// Statuses after picking: the Order's items are off the shelf count.
const AFTER_PICK: OrderStatus[] = [
  "picked",
  "out_for_delivery",
  "delivery_failed",
];

/** What an Order reserved and took from the shelf, per Product (ADR 0012). */
async function stockTaken(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<PickedStock[]> {
  const lines = await tx.orderLine.findMany({
    where: { orderId },
    select: {
      productId: true,
      orderedQty: true,
      fulfilledQty: true,
      substitutions: {
        take: 1,
        select: {
          substituteProductId: true,
          quantity: true,
          customerResponse: true,
        },
      },
    },
  });
  return lines.flatMap(({ substitutions: [sub], ...l }) => [
    {
      productId: l.productId,
      reserved: l.orderedQty,
      // Nothing entered counts as picked as ordered, as for the Final Total.
      taken: Math.min(l.fulfilledQty ?? l.orderedQty, l.orderedQty),
    },
    // A refused substitute stays on the shelf.
    ...(sub && sub.customerResponse !== "rejected"
      ? [
          {
            productId: sub.substituteProductId,
            reserved: 0,
            taken: sub.quantity,
          },
        ]
      : []),
  ]);
}

/**
 * Picking is done: the Final Total follows what was packed, never above
 * the estimate (ADR 0008). Paid online, the difference is refunded in one
 * go; cash on delivery, it is what the Rider collects. What was packed
 * leaves the shelf count (ADR 0012).
 */
async function settlePicked(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      hubId: true,
      totalCents: true,
      deliveryFeeCents: true,
      discountCents: true,
      lines: {
        select: {
          lineTotalCents: true,
          orderedQty: true,
          fulfilledQty: true,
          orderedWeightGrams: true,
          finalWeightGrams: true,
          substitutions: {
            take: 1,
            select: {
              quantity: true,
              priceCents: true,
              customerResponse: true,
            },
          },
        },
      },
    },
  });
  const finalTotalCents = priceFinal(
    order.lines.map(({ substitutions: [sub], ...l }) => ({
      ...l,
      // Refused costs nothing; anything else here was accepted (ADR 0010).
      substitute: sub
        ? {
            quantity: sub.quantity,
            unitPriceCents: sub.priceCents,
            accepted: sub.customerResponse !== "rejected",
          }
        : null,
    })),
    order
  );
  await pickStock(tx, {
    hubId: order.hubId,
    orderId,
    lines: await stockTaken(tx, orderId),
  });
  const refunded = await refundOrderPayment(
    tx,
    orderId,
    "picked",
    order.totalCents - finalTotalCents
  );
  await tx.order.update({
    where: { id: orderId },
    data: {
      finalTotalCents,
      ...(refunded > 0 ? { paymentStatus: "partially_refunded" } : {}),
    },
  });
}

/**
 * The Customer may cancel until picking starts (PRD ACC-5, docs/03 section
 * 7). An Order still waiting for payment goes through abandonPayment
 * instead, which closes its checkout first.
 */
export async function cancelOrder(
  customerId: string,
  orderId: string
): Promise<boolean> {
  const mine = await db.order.findFirst({
    where: { id: orderId, customerId },
    select: { id: true },
  });
  if (!mine) return false;
  return transitionOrder(
    orderId,
    "cancelled",
    { type: "customer", id: customerId },
    "Cancelled by the Customer",
    { from: ["confirmed"] }
  );
}

/**
 * The provider says an online Order is paid: confirm it and queue its
 * notice, inside the webhook's transaction. "late" when the Order is no
 * longer waiting (the 15-minute job cancelled it): the money arrived, so a
 * refund is owed (Batch 3.3).
 */
export async function confirmPaidOrder(
  tx: Prisma.TransactionClient,
  { orderId }: { orderId: string }
): Promise<"confirmed" | "late"> {
  const moved = await transitionOrder(
    orderId,
    "confirmed",
    { type: "system" },
    "Paid online",
    { from: ["pending_payment"], client: tx }
  );
  if (!moved) return "late";
  await tx.order.update({
    where: { id: orderId },
    data: { paymentStatus: "paid" },
  });
  await enqueueJob(tx, ORDER_CONFIRMED_JOB, { orderId });
  return "confirmed";
}

/** An online Order waits this long for payment (docs/03 section 6). */
export const PAYMENT_WINDOW_MINUTES = 15;

/**
 * Cancel online Orders unpaid after PAYMENT_WINDOW_MINUTES (cron tick):
 * their checkout is closed first, so no money can arrive after, then stock
 * and the Slot place go back and the lines return to the Customer's Cart.
 * An Order the provider will not close is left for its webhook.
 * Returns how many were cancelled.
 */
export async function expireUnpaidOrders(
  provider: PaymentProvider,
  now = new Date()
): Promise<number> {
  const stale = await db.order.findMany({
    where: {
      status: "pending_payment",
      placedAt: { lte: addMinutes(now, -PAYMENT_WINDOW_MINUTES) },
    },
    orderBy: { placedAt: "asc" },
    select: { id: true },
    take: 100,
  });
  let cancelled = 0;
  for (const { id } of stale) {
    if (!(await closeOnlinePayment(provider, id))) continue;
    const system = { type: "system" } as const;
    if (await cancelUnpaid(id, system, "Not paid within 15 minutes")) {
      cancelled++;
    }
  }
  return cancelled;
}

/**
 * The Customer gives up paying (back from the hosted checkout): the same
 * as the payment window ending, now. False when the Order is not theirs or
 * not waiting, or a payment is already going through.
 */
export async function abandonPayment(
  provider: PaymentProvider,
  customerId: string,
  orderId: string
): Promise<boolean> {
  const mine = await db.order.findFirst({
    where: { id: orderId, customerId, status: "pending_payment" },
    select: { id: true },
  });
  if (!mine || !(await closeOnlinePayment(provider, orderId))) return false;
  return cancelUnpaid(
    orderId,
    { type: "customer", id: customerId },
    "Payment not finished"
  );
}

/**
 * Staff close an Order waiting for a payment that will never settle on its
 * own: the provider charged a different amount, refunded in its dashboard
 * (ADR 0023). The Payment fails, so the right amount arriving later is
 * refunded as late; the lines go back to the Customer's Cart and they are
 * told. Audited by the caller.
 */
export async function cancelUnpaidByStaff(
  orderId: string,
  staffId: string,
  reason: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_waiting" }
  | { ok: false; errors: { reason: string } }
> {
  const why = reason.trim();
  if (!why)
    return {
      ok: false,
      errors: { reason: "Say what happened: it goes in the History." },
    };
  return (await cancelUnpaid(orderId, { type: "staff", id: staffId }, why))
    ? { ok: true }
    : { ok: false, reason: "not_waiting" };
}

// The Order row, then the Cart, then (in transitionOrder) Slot and stock:
// placeOrder takes Cart, Slot, stock in that order, so the two cannot deadlock.
async function cancelUnpaid(
  orderId: string,
  actor: Actor,
  reason: string
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<{ customer_id: string }[]>`
      SELECT customer_id FROM orders
      WHERE id = ${orderId}::uuid AND status = 'pending_payment'
      FOR UPDATE`;
    if (!order) return false;
    const lines = await tx.orderLine.findMany({
      where: { orderId },
      orderBy: { createdAt: "asc" },
    });
    await returnLinesToCart(
      tx,
      order.customer_id,
      lines.map((l) => ({
        productId: l.productId,
        quantity: l.orderedQty,
        seenPriceCents: l.unitPriceCents,
        substitutionPreference: l.substitutionPreference,
        preferredProductId: l.preferredProductId,
        note: l.note,
      }))
    );
    // Closed by the provider already, unless staff close it (ADR 0023).
    await failUnpaidPayment(tx, orderId);
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "failed" },
    });
    return transitionOrder(orderId, "cancelled", actor, reason, {
      from: ["pending_payment"],
      client: tx,
    });
  });
}
