"use server";

import { refresh } from "next/cache";

import { langOf } from "@/i18n/lang";
import { setCustomerLang } from "@/modules/customers";
import { requireCustomer } from "@/modules/identity";
import { cancelStockAlert, requestStockAlert } from "@/modules/inventory";

/**
 * "Tell me when it's back" on a sold-out Product, or undo it (ADR 0014).
 * The message comes in the page's language (ADR 0021).
 */
export async function stockAlertAction(
  productId: string,
  on: boolean,
  pageLang: string
): Promise<void> {
  const customer = await requireCustomer();
  if (on) {
    await setCustomerLang(customer.id, langOf(pageLang));
    await requestStockAlert(customer.id, productId);
  } else await cancelStockAlert(customer.id, productId);
  refresh();
}
