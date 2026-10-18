"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { STOCK_TAG } from "@/app/_data/storefront";

import { requireCustomer } from "@/modules/identity";
import { cancelOrder } from "@/modules/orders";

/** Cancel before picking (docs/03 section 7); the page then shows the result. */
export async function cancelOrderAction(fd: FormData): Promise<void> {
  const orderNo = String(fd.get("orderNo") ?? "");
  const customer = await requireCustomer(`/orders/${orderNo}`);
  if (await cancelOrder(customer.id, String(fd.get("orderId") ?? ""))) {
    updateTag(STOCK_TAG); // the stock is back on the shelf
  }
  redirect(`/orders/${encodeURIComponent(orderNo)}`);
}
