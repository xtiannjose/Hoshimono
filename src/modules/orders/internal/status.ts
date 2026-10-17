import type { ActorType, OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { releaseSlot } from "@/modules/delivery";
import { releaseStock } from "@/modules/inventory";

/** The Order lifecycle (docs/03-ARCHITECTURE.md section 7). */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["picking", "cancelled"],
  picking: ["picked", "cancelled"],
  picked: ["out_for_delivery"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["out_for_delivery", "cancelled"],
  delivered: [],
  cancelled: [],
};

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
  options: { from?: OrderStatus[] } = {}
): Promise<boolean> {
  return db.$transaction(async (tx) => {
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
      await releaseSlot(tx, order.slot_id);
    }
    return true;
  });
}

/** The Customer may cancel until picking starts (PRD ACC-3, docs/03 section 7). */
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
    { from: ["pending_payment", "confirmed"] }
  );
}
