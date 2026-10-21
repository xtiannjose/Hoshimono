"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { STOCK_TAG } from "@/app/_data/storefront";

import { requireCustomer } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import { abandonPayment, cancelOrder, getReorderLines } from "@/modules/orders";
import { paymentProvider } from "@/modules/payments";

import { jobHandlers } from "@/server/job-handlers";

import { fillCart, type FillResult } from "../../cart/fill";

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
    // A paid Order queued its refund: send it now, the cron run is the safety net.
    after(() => runDueJobs(jobHandlers).then(() => undefined));
  }
  redirect(`/orders/${encodeURIComponent(orderNo)}`);
}

/** Reorder: this Order's Products on top of the Cart, at today's prices (ADR 0014). */
export async function reorderAction(orderNo: string): Promise<FillResult> {
  const customer = await requireCustomer(`/orders/${orderNo}`);
  return fillCart((await getReorderLines(orderNo, customer.id)) ?? []);
}
