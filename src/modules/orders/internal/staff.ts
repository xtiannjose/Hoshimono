import type { Prisma } from "@/generated/prisma/client";
import type {
  ActorType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from "@/generated/prisma/enums";
import { db, type Client } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";

import { getOrderByNumber, type OrderDetail } from "./read";
import { nextStatuses } from "./status";

// shortcut: like read.ts, these join Customer, Staff, Slot, Payment and
// Refund rows through Prisma relations, though other modules own them.

export type QueueRow = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  customerName: string;
  contactPhone: string;
  slot: { startsAt: Date; endsAt: Date };
  totalCents: number;
  finalTotalCents: number | null;
};

const MAX_ROWS = 100;

/**
 * The staff order queue (PRD ADM-5): by Slot time, then placing time.
 * `q` finds an Order Number, a Customer's name or email, or a phone number
 * as typed; `day` is a Manila date (YYYY-MM-DD) of the Slot.
 */
export async function listOrdersForStaff({
  status,
  q,
  day,
}: {
  status?: OrderStatus;
  q?: string;
  day?: string;
}): Promise<QueueRow[]> {
  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status;
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    // Manila is UTC+8 all year: a Manila day is these 24 hours.
    const start = new Date(`${day}T00:00:00+08:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    where.slot = { startsAt: { gte: start, lt: end } };
  }
  const text = q?.trim();
  if (text) {
    const phone = normalizePhone(text);
    where.OR = [
      { orderNo: { contains: text, mode: "insensitive" } },
      { customer: { name: { contains: text, mode: "insensitive" } } },
      { customer: { email: { contains: text, mode: "insensitive" } } },
      ...(phone ? [{ contactPhone: phone }, { customer: { phone } }] : []),
    ];
  }
  const orders = await db.order.findMany({
    where,
    orderBy: [{ slot: { startsAt: "asc" } }, { placedAt: "asc" }],
    take: MAX_ROWS,
    select: {
      id: true,
      orderNo: true,
      status: true,
      paymentStatus: true,
      contactPhone: true,
      totalCents: true,
      finalTotalCents: true,
      customer: { select: { name: true } },
      slot: { select: { startsAt: true, endsAt: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { method: true },
      },
    },
  });
  return orders.map(({ customer, payments, ...o }) => ({
    ...o,
    customerName: customer.name ?? "",
    paymentMethod: payments[0]?.method ?? null,
  }));
}

export type StaffOrderDetail = OrderDetail & {
  customer: { name: string; email: string | null; phone: string | null };
  /** Oldest first, with who moved the Order and why. */
  history: {
    from: OrderStatus | null;
    to: OrderStatus;
    at: Date;
    actor: string;
    reason: string | null;
  }[];
  notes: { text: string; at: Date; staffName: string }[];
  refunds: { amountCents: number; reason: string; status: RefundStatus }[];
};

const ACTOR: Record<Exclude<ActorType, "staff">, string> = {
  customer: "Customer",
  system: "System",
};

/** One Order for staff by its number, any Customer, or null. */
export async function getOrderForStaff(
  orderNo: string
): Promise<StaffOrderDetail | null> {
  const detail = await getOrderByNumber({ orderNo });
  if (!detail) return null;
  const order = await db.order.findUniqueOrThrow({
    where: { id: detail.id },
    select: {
      customer: { select: { name: true, email: true, phone: true } },
      statusEvents: {
        orderBy: { at: "asc" },
        select: {
          from: true,
          to: true,
          at: true,
          actorType: true,
          actorId: true,
          reason: true,
        },
      },
      notes: {
        orderBy: { createdAt: "asc" },
        select: {
          text: true,
          createdAt: true,
          staff: { select: { name: true } },
        },
      },
      payments: {
        select: {
          refunds: {
            orderBy: { createdAt: "asc" },
            select: { amountCents: true, reason: true, status: true },
          },
        },
      },
    },
  });
  const staffIds = order.statusEvents
    .filter((e) => e.actorType === "staff" && e.actorId)
    .map((e) => e.actorId!);
  const names = new Map(
    (
      await db.staff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, name: true },
      })
    ).map((s) => [s.id, s.name])
  );
  return {
    ...detail,
    customer: {
      name: order.customer.name ?? "",
      email: order.customer.email,
      phone: order.customer.phone,
    },
    history: order.statusEvents.map((e) => ({
      from: e.from,
      to: e.to,
      at: e.at,
      actor:
        e.actorType === "staff"
          ? (names.get(e.actorId ?? "") ?? "Staff")
          : ACTOR[e.actorType],
      reason: e.reason,
    })),
    notes: order.notes.map((n) => ({
      text: n.text,
      at: n.createdAt,
      staffName: n.staff.name,
    })),
    refunds: order.payments.flatMap((p) => p.refunds),
  };
}

export const MAX_ORDER_NOTE_LENGTH = 500;

/** A staff note on an Order (ADR 0009 form result). */
export async function addOrderNote(
  orderId: string,
  staffId: string,
  text: string,
  client: Client = db
): Promise<{ ok: true } | { ok: false; errors: { text: string } }> {
  const note = text.trim();
  if (!note) return { ok: false, errors: { text: "Write a note first." } };
  if (note.length > MAX_ORDER_NOTE_LENGTH) {
    return {
      ok: false,
      errors: {
        text: `Keep a note under ${MAX_ORDER_NOTE_LENGTH} characters.`,
      },
    };
  }
  await client.orderNote.create({ data: { orderId, staffId, text: note } });
  return { ok: true };
}

/**
 * Where staff may move an Order from `status`. An unpaid online Order is
 * left to its webhook and the Payment Window, never moved by hand.
 */
export function staffMoves(status: OrderStatus): OrderStatus[] {
  return status === "pending_payment" ? [] : nextStatuses(status);
}
