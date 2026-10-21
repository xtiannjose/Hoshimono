"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";

import { STOCK_TAG } from "@/app/_data/storefront";
import type { OrderStatus } from "@/generated/prisma/enums";
import { requireStaff } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import { addOrderNote, staffMoves, transitionOrder } from "@/modules/orders";

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
