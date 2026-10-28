import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/enums";

/** An Order's status in words, for Customers and staff alike. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Waiting for payment",
  confirmed: "Confirmed",
  picking: "Picking",
  picked: "Ready for the Rider",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  cancelled: "Cancelled",
};

/** How an Order is paid, in words. */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  gcash: "GCash",
  card: "Card",
};

/** A Payment's status in words, for staff. */
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Not paid",
  paid: "Paid",
  partially_refunded: "Partly refunded",
  refunded: "Refunded",
  failed: "Not paid",
  cod_pending: "Cash on delivery",
  cod_collected: "Cash collected",
};
