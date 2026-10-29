"use server";

import { randomUUID } from "node:crypto";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";

import { STOCK_TAG } from "@/app/_data/storefront";
import type { OrderStatus } from "@/generated/prisma/enums";
import { recordAudits, requireStaff } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import { formatDate, formatSlot, formatTime } from "@/lib/dates";
import { formatMoney, parseMoney } from "@/lib/money";
import { setCustomerBlocked } from "@/modules/customers";
import {
  sendSlotMoved,
  sendStaffMessage,
  sendVoucherGiven,
} from "@/modules/notifications";
import {
  addOrderNote,
  changeOrderAddress,
  confirmPaidOrder,
  finishPicking,
  getOrderForNotice,
  moveOrderSlot,
  staffMoves,
  transitionOrder,
} from "@/modules/orders";
import { recordPaidByStaff } from "@/modules/payments";
import { createCreditVoucher } from "@/modules/pricing";

import { jobHandlers } from "@/server/job-handlers";

import { adminWrite } from "../admin-write";

export type OrderFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

// Moves that need a reason, for the history and the Customer's questions.
const NEEDS_REASON: OrderStatus[] = ["cancelled", "delivery_failed"];

/**
 * Move an Order along its lifecycle (PRD ADM-5). `from` is the status the
 * page showed: if someone moved it meanwhile, nothing changes.
 */
export async function moveOrderAction(
  orderId: string,
  orderNo: string,
  from: OrderStatus,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("orders", `/admin/orders/${orderNo}`);
  const to = String(fd.get("to") ?? "") as OrderStatus;
  const reason = String(fd.get("reason") ?? "").trim();
  if (!staffMoves(from).includes(to)) {
    return { errors: { to: "Choose where the Order goes next." } };
  }
  if (NEEDS_REASON.includes(to) && !reason) {
    return { errors: { reason: "Say why: it goes in the Order's history." } };
  }
  if (to === "picked") {
    // Waits for open Substitution Windows, then sets the Final Total (ADR 0010).
    const done = await finishPicking(orderId, { type: "staff", id: staff.id });
    if (!done.ok) {
      return {
        errors: {
          form:
            done.reason === "waiting_for_customer"
              ? `Waiting for the Customer about a substitute until ${formatTime(done.until)}.`
              : "This Order changed meanwhile. Reload to see where it is now.",
        },
      };
    }
    await recordAudits([
      {
        staffId: staff.id,
        action: "status",
        entity: "order",
        entityId: orderId,
        before: { status: from },
        after: { status: to },
      },
    ]);
    after(() => runDueJobs(jobHandlers).then(() => undefined));
    refresh();
    return { errors: {}, saved: true };
  }
  const result = await adminWrite(
    staff.id,
    async (tx) => ({
      ok: await transitionOrder(
        orderId,
        to,
        { type: "staff", id: staff.id },
        reason || undefined,
        { from: [from], client: tx }
      ),
    }),
    () => [
      {
        action: "status",
        entity: "order",
        entityId: orderId,
        before: { status: from },
        after: { status: to, reason: reason || null },
      },
    ]
  );
  if (!result.ok) {
    return {
      errors: {
        form: "This Order changed meanwhile. Reload to see where it is now.",
      },
    };
  }
  if (to === "cancelled") updateTag(STOCK_TAG); // its stock is back on sale
  // A cancel or a finished pick may have queued a refund: send it now.
  after(() => runDueJobs(jobHandlers).then(() => undefined));
  refresh();
  return { errors: {}, saved: true };
}

/** A note for the other staff; the Customer never sees it. */
export async function addNoteAction(
  orderId: string,
  orderNo: string,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("orders", `/admin/orders/${orderNo}`);
  const text = String(fd.get("text") ?? "");
  const result = await adminWrite(
    staff.id,
    (tx) => addOrderNote(orderId, staff.id, text, tx),
    () => [
      {
        action: "note",
        entity: "order",
        entityId: orderId,
        after: { text: text.trim() },
      },
    ]
  );
  if (!result.ok) return { errors: result.errors };
  refresh();
  return { errors: {}, saved: true };
}

/**
 * PayMongo shows the Order paid but no webhook applied it (docs/runbook.md,
 * 1a): record it as a verified webhook would. An Order that had closed
 * meanwhile gets the money back as a refund.
 */
export async function recordPaymentAction(
  orderId: string,
  orderNo: string,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("refunds", `/admin/orders/${orderNo}`);
  const paymentRef = String(fd.get("paymentRef") ?? "").trim();
  if (!paymentRef) {
    return { errors: { paymentRef: "Copy the payment id from PayMongo." } };
  }
  if (fd.get("amountMatches") !== "yes") {
    return {
      errors: {
        form: "Tick the box only if PayMongo shows this amount paid. A different amount: refund it in PayMongo and cancel the Order.",
      },
    };
  }
  const result = await recordPaidByStaff(orderId, paymentRef, {
    onPaid: confirmPaidOrder,
  });
  if (result === "not_waiting") {
    return { errors: { form: "This Order has no online payment waiting." } };
  }
  await recordAudits([
    {
      staffId: staff.id,
      action: "payment_recorded",
      entity: "order",
      entityId: orderId,
      after: { paymentRef, result },
    },
  ]);
  after(() => runDueJobs(jobHandlers).then(() => undefined));
  refresh();
  return { errors: {}, saved: true };
}

const MAX_TEXT = 300;

/** A text to the Customer about their Order; it goes in the Order's notes too. */
export async function textCustomerAction(
  orderId: string,
  orderNo: string,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("orders", `/admin/orders/${orderNo}`);
  const text = String(fd.get("text") ?? "").trim();
  if (!text || text.length > MAX_TEXT) {
    return {
      errors: { text: `Write the text, up to ${MAX_TEXT} characters.` },
    };
  }
  const order = await getOrderForNotice(orderId);
  if (!order?.contactPhone) {
    return { errors: { form: "This Order has no number to text." } };
  }
  try {
    await sendStaffMessage({
      ref: `staff-message:${randomUUID()}`,
      phone: order.contactPhone,
      text,
    });
  } catch (error) {
    console.error("[orders] staff text not sent:", error);
    return { errors: { form: "The text did not go out. Try again, or call." } };
  }
  await addOrderNote(orderId, staff.id, `Texted the Customer: ${text}`);
  await recordAudits([
    {
      staffId: staff.id,
      action: "texted_customer",
      entity: "order",
      entityId: orderId,
      after: { text },
    },
  ]);
  refresh();
  return { errors: {}, saved: true };
}

// The most one Voucher made by hand may be worth; a larger make-good
// should be a refund.
const MAX_GOODWILL_CENTS = 200_000;

/** A Voucher to make up for an Order, with a text and email to say so. */
export async function giveVoucherAction(
  orderId: string,
  orderNo: string,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("refunds", `/admin/orders/${orderNo}`);
  const cents = parseMoney(String(fd.get("amount") ?? ""));
  const reason = String(fd.get("reason") ?? "").trim();
  if (!cents || cents <= 0 || cents > MAX_GOODWILL_CENTS) {
    return {
      errors: {
        amount: `Enter an amount up to ${formatMoney(MAX_GOODWILL_CENTS)}.`,
      },
    };
  }
  if (!reason) {
    return { errors: { reason: "Say why: it goes in the Order's notes." } };
  }
  const order = await getOrderForNotice(orderId);
  if (!order) return { errors: { form: "This Order no longer exists." } };
  const result = await adminWrite(
    staff.id,
    async (tx) => {
      const voucher = await createCreditVoucher(tx, order.customerId, cents);
      await addOrderNote(
        orderId,
        staff.id,
        `Gave a ${formatMoney(cents)} Voucher (${voucher.code}): ${reason}`,
        tx
      );
      return { ok: true as const, voucher };
    },
    (done) => [
      {
        action: "voucher_given",
        entity: "order",
        entityId: orderId,
        after: { code: done.voucher.code, amountCents: cents, reason },
      },
    ]
  );
  try {
    await sendVoucherGiven({
      ref: `voucher:${result.voucher.id}`,
      email: order.customer.email,
      phone: order.contactPhone || null,
      lang: order.customer.lang,
      orderNo: order.orderNo,
      amount: formatMoney(cents),
      code: result.voucher.code,
      until: formatDate(result.voucher.endsAt, order.customer.lang),
    });
  } catch (error) {
    console.error("[orders] Voucher notice not sent:", error);
    refresh();
    return {
      errors: {
        form: `The Voucher ${result.voucher.code} is made, but the message did not go out: tell the Customer.`,
      },
    };
  }
  refresh();
  return { errors: {}, saved: true };
}

/** Deliver in another Slot; the Customer gets a text with the new time. */
export async function moveSlotAction(
  orderId: string,
  orderNo: string,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("orders", `/admin/orders/${orderNo}`);
  const slotId = String(fd.get("slotId") ?? "");
  const moved = await moveOrderSlot(orderId, slotId);
  if (!moved.ok) {
    return {
      errors: {
        slotId:
          moved.reason === "not_movable"
            ? "This Order has left the Hub: it can't change Slot now."
            : "That Slot is full or closed. Choose another.",
      },
    };
  }
  const when = formatSlot(moved.startsAt, moved.endsAt);
  await addOrderNote(orderId, staff.id, `Moved to ${when}.`);
  await recordAudits([
    {
      staffId: staff.id,
      action: "slot_moved",
      entity: "order",
      entityId: orderId,
      after: { slotId },
    },
  ]);
  const order = await getOrderForNotice(orderId);
  if (order?.contactPhone) {
    const { lang } = order.customer;
    try {
      await sendSlotMoved({
        ref: `slot-moved:${orderId}:${slotId}`,
        phone: order.contactPhone,
        lang,
        orderNo: order.orderNo,
        slot: formatSlot(moved.startsAt, moved.endsAt, undefined, lang),
      });
    } catch (error) {
      console.error("[orders] Slot move text not sent:", error);
      refresh();
      return {
        errors: {
          form: "Moved, but the text did not go out: tell the Customer.",
        },
      };
    }
  }
  refresh();
  return { errors: {}, saved: true };
}

/** Deliver to another of the Customer's saved addresses in the same Zone. */
export async function changeAddressAction(
  orderId: string,
  orderNo: string,
  _prev: OrderFormState,
  fd: FormData
): Promise<OrderFormState> {
  const staff = await requireStaff("orders", `/admin/orders/${orderNo}`);
  const addressId = String(fd.get("addressId") ?? "");
  const result = await changeOrderAddress(orderId, addressId);
  if (!result.ok) {
    return {
      errors: {
        addressId:
          result.reason === "other_zone"
            ? "That address is in another Zone, with another fee: cancel and let the Customer order again."
            : result.reason === "not_movable"
              ? "This Order has left the Hub: it can't change address now."
              : "Choose one of the Customer's addresses.",
      },
    };
  }
  await addOrderNote(orderId, staff.id, "Delivery address changed.");
  await recordAudits([
    {
      staffId: staff.id,
      action: "address_changed",
      entity: "order",
      entityId: orderId,
      after: { addressId },
    },
  ]);
  refresh();
  return { errors: {}, saved: true };
}

/**
 * Block the Order's Customer from placing Orders, or unblock them
 * (docs/security-review.md, M1). Their Orders already placed go on.
 */
export async function blockCustomerAction(
  orderId: string,
  orderNo: string,
  block: boolean
): Promise<void> {
  const staff = await requireStaff("refunds", `/admin/orders/${orderNo}`);
  const order = await getOrderForNotice(orderId);
  if (!order) return;
  await setCustomerBlocked(order.customerId, block);
  await addOrderNote(
    orderId,
    staff.id,
    block ? "Blocked the Customer from ordering." : "Unblocked the Customer."
  );
  await recordAudits([
    {
      staffId: staff.id,
      action: block ? "customer_blocked" : "customer_unblocked",
      entity: "customer",
      entityId: order.customerId,
    },
  ]);
  refresh();
}
