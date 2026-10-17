"use server";

import { redirect } from "next/navigation";

import { requireCustomer } from "@/modules/identity";
import { cancelOrder } from "@/modules/orders";

/** Cancel before picking (docs/03 section 7); the page then shows the result. */
export async function cancelOrderAction(fd: FormData): Promise<void> {
  const orderNo = String(fd.get("orderNo") ?? "");
  const customer = await requireCustomer(`/orders/${orderNo}`);
  await cancelOrder(customer.id, String(fd.get("orderId") ?? ""));
  redirect(`/orders/${encodeURIComponent(orderNo)}`);
}
