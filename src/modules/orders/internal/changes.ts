import { randomUUID } from "node:crypto";

import type { OrderStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { getAddress } from "@/modules/customers";
import { bookSlot, releaseSlot, resolveZone } from "@/modules/delivery";
import { enqueueJob } from "@/modules/jobs";

import { OUT_FOR_DELIVERY_JOB } from "./delivery";
import { answerSubstitution } from "./picking";

// Changes staff make to a placed Order when plans change at the Hub
// (docs/runbook.md, "Things the app cannot do yet"). None changes what
// the Order costs.

/** Still at the Hub: a new Slot or address does not reach a Rider mid-trip. */
const AT_HUB: OrderStatus[] = [
  "confirmed",
  "picking",
  "picked",
  "delivery_failed",
];

export type MoveResult =
  | { ok: true; startsAt: Date; endsAt: Date }
  | { ok: false; reason: "not_movable" | "slot_unavailable" };

/**
 * Deliver the Order in another Slot of its Hub that still takes Orders;
 * its place in the old Slot is given back.
 */
export async function moveOrderSlot(
  orderId: string,
  slotId: string
): Promise<MoveResult> {
  if (!isUuid(slotId)) return { ok: false, reason: "slot_unavailable" };
  return db.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<
      { status: OrderStatus; hub_id: string; slot_id: string }[]
    >`SELECT status, hub_id, slot_id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
    if (!order || !AT_HUB.includes(order.status)) {
      return { ok: false, reason: "not_movable" };
    }
    if (
      order.slot_id === slotId ||
      // No cart holds a place for staff: any free place will do.
      !(await bookSlot(tx, {
        slotId,
        cartId: randomUUID(),
        hubId: order.hub_id,
      }))
    ) {
      return { ok: false, reason: "slot_unavailable" };
    }
    await releaseSlot(tx, order.slot_id);
    const { slot } = await tx.order.update({
      where: { id: orderId },
      data: { slotId },
      select: { slot: { select: { startsAt: true, endsAt: true } } },
    });
    return { ok: true, ...slot };
  });
}

/**
 * Deliver to another of the Customer's saved addresses that the Order's
 * Hub serves. In another Zone the Delivery Fee stays as placed (ADR 0022).
 * Another Hub means a new Order: its stock and Slots are not this one's.
 */
export async function changeOrderAddress(
  orderId: string,
  addressId: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_movable" | "address_not_found" | "other_hub" }
> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, status: true, hubId: true },
  });
  if (!order || !AT_HUB.includes(order.status)) {
    return { ok: false, reason: "not_movable" };
  }
  const address = await getAddress(order.customerId, addressId);
  if (!address) return { ok: false, reason: "address_not_found" };
  const zone = await resolveZone(address);
  if (zone?.hubId !== order.hubId) return { ok: false, reason: "other_hub" };
  const { count } = await db.order.updateMany({
    where: { id: orderId, status: { in: AT_HUB } },
    data: {
      addressSnapshot: {
        label: address.label,
        line1: address.line1,
        barangay: address.barangay,
        city: address.city,
        landmark: address.landmark,
        notes: address.notes,
        zone: zone.name,
      },
    },
  });
  return count ? { ok: true } : { ok: false, reason: "not_movable" };
}

/**
 * Another Rider takes an Order already on its way (a breakdown, a dead
 * phone). The PIN stays; the Customer is told who is coming now.
 */
export async function handOverOrder(
  orderId: string,
  riderId: string,
  now = new Date()
): Promise<{ ok: true } | { ok: false; reason: "not_a_rider" | "not_out" }> {
  const rider = await db.staff.findUnique({
    where: { id: riderId },
    select: { role: true, isActive: true },
  });
  if (rider?.role !== "rider" || !rider.isActive) {
    return { ok: false, reason: "not_a_rider" };
  }
  return db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: {
        id: orderId,
        status: "out_for_delivery",
        riderId: { not: riderId },
      },
      data: { riderId },
    });
    if (!count) return { ok: false, reason: "not_out" };
    await enqueueJob(tx, OUT_FOR_DELIVERY_JOB, {
      orderId,
      dispatchedAt: now.toISOString(),
    });
    return { ok: true };
  });
}

/**
 * The Customer answered a substitute by phone instead of the link: the
 * same rules as the link, including that silence after the window is a
 * yes (ADR 0010).
 */
export async function answerSubstitutionByPhone(
  orderLineId: string,
  accept: boolean
) {
  if (!isUuid(orderLineId)) return null;
  const sub = await db.substitution.findFirst({
    where: { orderLineId, customerResponse: null, token: { not: null } },
    select: { token: true },
  });
  return sub?.token ? answerSubstitution(sub.token, accept) : null;
}
