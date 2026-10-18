import { formatSlot } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { JobHandlers } from "@/modules/jobs";
import { sendOrderConfirmed } from "@/modules/notifications";
import { getOrderForNotice, ORDER_CONFIRMED_JOB } from "@/modules/orders";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Wires job kinds to modules; modules stay unaware of each other here.
export const jobHandlers: JobHandlers = {
  async [ORDER_CONFIRMED_JOB](payload) {
    const order = await getOrderForNotice(String(payload.orderId));
    if (!order) return;
    await sendOrderConfirmed({
      orderId: order.id,
      orderNo: order.orderNo,
      email: order.customer.email,
      phone: order.contactPhone,
      slot: formatSlot(order.slot.startsAt, order.slot.endsAt),
      total: formatMoney(order.totalCents),
      trackingUrl: new URL(`/orders/${order.orderNo}`, appUrl()).toString(),
      lines: order.lines.map((l) => ({
        name: l.nameSnapshot,
        quantity: l.orderedQty,
      })),
      cashOnDelivery: order.payments[0]?.method === "cod",
    });
  },
};
