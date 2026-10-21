"use server";

import { refresh } from "next/cache";

import { requireCustomer } from "@/modules/identity";
import { cancelStockAlert, requestStockAlert } from "@/modules/inventory";

/** "Tell me when it's back" on a sold-out Product, or undo it (ADR 0014). */
export async function stockAlertAction(
  productId: string,
  on: boolean
): Promise<void> {
  const customer = await requireCustomer();
  if (on) await requestStockAlert(customer.id, productId);
  else await cancelStockAlert(customer.id, productId);
  refresh();
}
