"use server";

import { refresh, updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { STOCK_TAG } from "@/app/_data/storefront";
import { jobHandlers } from "@/app/api/cron/handlers";
import { formatMoney } from "@/lib/money";
import { clientIp, takeToken } from "@/lib/rate-limit";
import { getCartId } from "@/modules/cart";
import { getAddress } from "@/modules/customers";
import { holdSlot, resolveZone } from "@/modules/delivery";
import { requireCustomer } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import { placeOrder, type PlaceOrderResult } from "@/modules/orders";

const ORDERS_PER_HOUR = 10;
const ORDERS_PER_HOUR_PER_IP = 20;

export type HoldState =
  { ok: true; expiresAt: string } | { ok: false; message: string };

/** Hold the chosen Slot for 10 minutes (PRD CHK-2) at the address's Hub. */
export async function holdSlotAction(
  slotId: string,
  addressId: string
): Promise<HoldState> {
  const customer = await requireCustomer("/checkout");
  const [cartId, address] = await Promise.all([
    getCartId({ customerId: customer.id }),
    getAddress(customer.id, addressId),
  ]);
  if (!cartId) return { ok: false, message: "Your cart is empty." };
  const zone = address ? await resolveZone(address) : null;
  if (!zone) {
    return { ok: false, message: "Please choose an address we deliver to." };
  }
  const result = await holdSlot(cartId, slotId, { hubId: zone.hubId });
  if (result.ok) return { ok: true, expiresAt: result.expiresAt.toISOString() };
  refresh();
  return {
    ok: false,
    message:
      result.reason === "full"
        ? "That slot just filled up. Please choose another."
        : "That slot is no longer open. Please choose another.",
  };
}

export type CheckoutState = {
  message?: string;
  /** What was typed, so the form refills after React resets it. */
  values?: { phone: string; riderNotes: string; slotId: string };
};

function explain(result: Exclude<PlaceOrderResult, { ok: true }>): string {
  switch (result.reason) {
    case "total_changed":
      return `Prices changed while you were checking out. Your total is now ${formatMoney(result.totalCents)}. Please check it and place your order again.`;
    case "below_minimum":
      return `Add ${formatMoney(result.shortByCents)} more to reach the minimum order for this area.`;
    case "out_of_stock":
      return "Sorry, some items just sold out. Please check your cart.";
    case "slot_unavailable":
      return "That delivery slot just filled up. Please choose another.";
    case "invalid_phone":
      return "Please enter a mobile number like 0917 123 4567.";
    case "out_of_zone":
      return "We do not deliver to this address yet. Please choose another.";
    case "address_not_found":
      return "Please choose a delivery address.";
    case "empty_cart":
      return "Your cart is empty.";
    case "nothing_in_stock":
      return "Sorry, everything in your cart just sold out. Please choose other items.";
    case "cart_changed":
      return "Your cart changed in another tab. Please check it and place your order again.";
    case "too_many_open_orders":
      return "You already have several orders on the way. Please wait for one to arrive, or cancel one first.";
    case "over_cod_limit":
      return `Cash on delivery orders can be up to ${formatMoney(result.limitCents)}. Please remove some items or split your order.`;
    case "already_placed":
      return "This cart was already ordered. You can find it under your orders.";
    case "invalid":
      return "Please choose a delivery slot.";
  }
}

export async function placeOrderAction(
  _prev: CheckoutState,
  fd: FormData
): Promise<CheckoutState> {
  const customer = await requireCustomer("/checkout");
  const text = (key: string) => String(fd.get(key) ?? "");
  const values = {
    phone: text("phone"),
    riderNotes: text("riderNotes"),
    slotId: text("slotId"),
  };
  // COD Orders reserve stock unpaid, so cap how many one account or IP
  // can place in an hour (docs/03 section 12).
  for (const [key, limit] of [
    [`order:customer:${customer.id}`, ORDERS_PER_HOUR],
    [`order:ip:${clientIp(await headers())}`, ORDERS_PER_HOUR_PER_IP],
  ] as const) {
    if (!(await takeToken(key, limit, 60 * 60)).ok) {
      return {
        message:
          "You have placed several orders just now. Please wait a while, or contact us for help.",
        values,
      };
    }
  }
  const result = await placeOrder({
    customerId: customer.id,
    addressId: text("addressId"),
    slotId: values.slotId,
    contactPhone: values.phone,
    riderNotes: values.riderNotes,
    paymentMethod: "cod",
    expectedTotalCents: Number(text("expectedTotalCents")),
    idempotencyKey: text("idempotencyKey"),
  });
  if (result.ok) {
    // Stock just changed: shelves must not keep offering what is reserved.
    updateTag(STOCK_TAG);
    // Send the confirmation now; the cron run is the safety net.
    after(() => runDueJobs(jobHandlers).then(() => undefined));
    redirect(`/checkout/confirmed/${result.orderNo}`);
  }
  // Show the Cart, Slots and total as they are now.
  refresh();
  return { message: explain(result), values };
}
