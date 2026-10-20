import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// shortcut: these reads join Slot, Customer and Payment rows through Prisma
// relations in one query, though delivery, customers and payments own those
// tables. Move to their module calls if a table ever leaves this database.

export type OrderSummary = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  totalCents: number;
  placedAt: Date;
  slot: { startsAt: Date; endsAt: Date };
  itemCount: number;
};

export type OrderDetail = OrderSummary & {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  /** Set once picked: what the packed items came to (ADR 0008). */
  finalTotalCents: number | null;
  /** Given back to the Customer so far, paid online. */
  refundedCents: number;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  vatCents: number;
  contactPhone: string;
  riderNotes: string | null;
  address: {
    label: string;
    line1: string;
    barangay: string;
    city: string;
    landmark: string;
  };
  lines: {
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    weighed: boolean;
  }[];
  /** Oldest first. */
  events: { to: OrderStatus; at: Date }[];
};

/** The Customer's Orders, newest first. */
export async function listOrders(customerId: string): Promise<OrderSummary[]> {
  const orders = await db.order.findMany({
    where: { customerId },
    orderBy: { placedAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNo: true,
      status: true,
      totalCents: true,
      placedAt: true,
      slot: { select: { startsAt: true, endsAt: true } },
      lines: { select: { orderedQty: true } },
    },
  });
  return orders.map(({ lines, ...o }) => ({
    ...o,
    itemCount: lines.reduce((n, l) => n + l.orderedQty, 0),
  }));
}

/** One of the Customer's Orders by its number, or null. */
export async function getOrder(
  customerId: string,
  orderNo: string
): Promise<OrderDetail | null> {
  const order = await db.order.findFirst({
    where: { orderNo, customerId },
    include: {
      slot: { select: { startsAt: true, endsAt: true } },
      lines: { orderBy: { createdAt: "asc" } },
      statusEvents: { orderBy: { at: "asc" }, select: { to: true, at: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { method: true, refundedCents: true },
      },
    },
  });
  if (!order) return null;
  const address = order.addressSnapshot as OrderDetail["address"];
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    totalCents: order.totalCents,
    placedAt: order.placedAt,
    slot: order.slot,
    itemCount: order.lines.reduce((n, l) => n + l.orderedQty, 0),
    paymentStatus: order.paymentStatus,
    paymentMethod: order.payments[0]?.method ?? null,
    finalTotalCents: order.finalTotalCents,
    refundedCents: order.payments[0]?.refundedCents ?? 0,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    deliveryFeeCents: order.deliveryFeeCents,
    vatCents: order.vatCents,
    contactPhone: order.contactPhone,
    riderNotes: order.riderNotes,
    address: {
      label: address.label,
      line1: address.line1,
      barangay: address.barangay,
      city: address.city,
      landmark: address.landmark,
    },
    lines: order.lines.map((l) => ({
      name: l.nameSnapshot,
      quantity: l.orderedQty,
      unitPriceCents: l.unitPriceCents,
      lineTotalCents: l.lineTotalCents,
      weighed: l.orderedWeightGrams !== null,
    })),
    events: order.statusEvents,
  };
}

/** What the confirmation notice needs; no Customer check (system use). */
export async function getOrderForNotice(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      contactPhone: true,
      totalCents: true,
      customer: { select: { email: true } },
      slot: { select: { startsAt: true, endsAt: true } },
      lines: {
        orderBy: { createdAt: "asc" },
        select: {
          nameSnapshot: true,
          orderedQty: true,
          orderedWeightGrams: true,
        },
      },
      payments: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { method: true },
      },
    },
  });
}
