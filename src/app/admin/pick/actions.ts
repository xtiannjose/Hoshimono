"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { formatTime } from "@/lib/dates";
import { recordAudits, requireStaff } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import {
  addOrderNote,
  answerSubstitutionByPhone,
  finishPicking,
  proposeSubstitution,
  recordPick,
  transitionOrder,
  type ProposeResult,
} from "@/modules/orders";

import { jobHandlers } from "@/server/job-handlers";

export type PickFormState = { errors: Record<string, string>; saved?: boolean };

const picker = (orderNo: string) =>
  requireStaff("picking", `/admin/pick/${orderNo}`);

// Send what the change queued (a Customer's question, a refund) at once.
const sendNow = () =>
  after(() => runDueJobs(jobHandlers).then(() => undefined));

const WHY_NOT: Record<Extract<ProposeResult, { ok: false }>["reason"], string> =
  {
    not_found: "Choose a Product that is on sale.",
    not_picking: "Start picking this Order first.",
    weighed:
      "Items sold by weight are never swapped: pack what is there or mark it short.",
    no_substitute: "The Customer asked for no substitute: mark it short.",
    same_product: "Choose a different Product.",
    not_their_choice: "Only the Product the Customer chose can stand in here.",
    already_substituted: "This line already has a substitute.",
    nothing_missing: "Everything was found: nothing to substitute.",
  };

/** Start picking a confirmed Order; the Customer can no longer cancel. */
export async function startPickingAction(
  orderId: string,
  orderNo: string
): Promise<PickFormState> {
  const staff = await picker(orderNo);
  const moved = await transitionOrder(
    orderId,
    "picking",
    { type: "staff", id: staff.id },
    undefined,
    { from: ["confirmed"] }
  );
  if (!moved) {
    return {
      errors: { form: "This Order is not waiting to be picked. Reload." },
    };
  }
  await recordAudits([
    {
      staffId: staff.id,
      action: "status",
      entity: "order",
      entityId: orderId,
      after: { status: "picking" },
    },
  ]);
  refresh();
  return { errors: {}, saved: true };
}

/** What was found for one line: pieces, or a weighed pack's grams. */
export async function recordPickAction(
  lineId: string,
  orderNo: string,
  _prev: PickFormState,
  fd: FormData
): Promise<PickFormState> {
  const staff = await picker(orderNo);
  const number = (key: string) => {
    const raw = fd.get(key);
    return raw === null || raw === "" ? undefined : Number(raw);
  };
  const entry = { found: number("found"), grams: number("grams") };
  const result = await recordPick(lineId, entry);
  if (!result.ok) return { errors: result.errors };
  await recordAudits([
    {
      staffId: staff.id,
      action: "pick",
      entity: "order_line",
      entityId: lineId,
      after: entry,
    },
  ]);
  refresh();
  return { errors: {}, saved: true };
}

/** Offer a substitute for what was not found (ADR 0010). */
export async function substituteAction(
  lineId: string,
  orderNo: string,
  _prev: PickFormState,
  fd: FormData
): Promise<PickFormState> {
  const staff = await picker(orderNo);
  const productId = String(fd.get("productId") ?? "");
  const result = await proposeSubstitution(lineId, staff.id, productId);
  if (!result.ok) return { errors: { substitute: WHY_NOT[result.reason] } };
  await recordAudits([
    {
      staffId: staff.id,
      action: "substitute",
      entity: "order_line",
      entityId: lineId,
      after: { productId, asked: result.asked },
    },
  ]);
  if (result.asked) sendNow();
  refresh();
  return { errors: {}, saved: true };
}

/** Finish: sets the Final Total and refunds any difference (ADR 0008). */
export async function finishPickingAction(
  orderId: string,
  orderNo: string
): Promise<PickFormState> {
  const staff = await picker(orderNo);
  const done = await finishPicking(orderId, { type: "staff", id: staff.id });
  if (!done.ok) {
    return {
      errors: {
        form:
          done.reason === "waiting_for_customer"
            ? `Waiting for the Customer about a substitute until ${formatTime(done.until)}. Pick another Order meanwhile.`
            : "This Order is not being picked. Reload.",
      },
    };
  }
  await recordAudits([
    {
      staffId: staff.id,
      action: "status",
      entity: "order",
      entityId: orderId,
      after: { status: "picked" },
    },
  ]);
  sendNow();
  refresh();
  return { errors: {}, saved: true };
}

/**
 * The Customer answered the substitute on the phone instead of the link.
 * Same rules as the link; the answer goes in the Order's notes.
 */
export async function phoneAnswerAction(
  orderId: string,
  lineId: string,
  orderNo: string,
  accept: boolean
): Promise<void> {
  const staff = await picker(orderNo);
  const answer = await answerSubstitutionByPhone(lineId, accept);
  if (answer === "accepted" || answer === "refused") {
    await addOrderNote(
      orderId,
      staff.id,
      `Customer said ${accept ? "yes" : "no"} to the substitute by phone.`
    );
    await recordAudits([
      {
        staffId: staff.id,
        action: "substitution_by_phone",
        entity: "order",
        entityId: orderId,
        after: { lineId, accept },
      },
    ]);
  }
  refresh();
}
