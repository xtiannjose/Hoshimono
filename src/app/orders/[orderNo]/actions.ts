"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { STOCK_TAG } from "@/app/_data/storefront";

import { requireCustomer } from "@/modules/identity";
import { abandonPayment, cancelOrder } from "@/modules/orders";
import { paymentProvider } from "@/modules/payments";

/** Cancel before picking (docs/03 section 7); the page then shows the result. */
export async function cancelOrderAction(fd: FormData): Promise<void> {
  const orderNo = String(fd.get("orderNo") ?? "");
  const customer = await requireCustomer(`/orders/${orderNo}`);
  const orderId = String(fd.get("orderId") ?? "");
  const provider = paymentProvider();
  // Not paid yet: close the checkout too, so it cannot take money after.
  const cancelled =
    (await cancelOrder(customer.id, orderId)) ||
    (provider !== null &&
      (await abandonPayment(provider, customer.id, orderId)));
  if (cancelled) {
    updateTag(STOCK_TAG); // the stock is back on the shelf
  }
  redirect(`/orders/${encodeURIComponent(orderNo)}`);
}
