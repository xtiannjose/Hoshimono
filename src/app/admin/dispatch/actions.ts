"use server";

import { refresh } from "next/cache";
import { after } from "next/server";

import { parseMoney } from "@/lib/money";
import { recordAudits, requireStaff } from "@/modules/identity";
import { runDueJobs } from "@/modules/jobs";
import {
  completeDelivery,
  deliverWithoutPin,
  dispatchOrder,
  failDelivery,
} from "@/modules/orders";
import { recordCashHandover } from "@/modules/payments";

import { jobHandlers } from "@/server/job-handlers";

export type DispatchFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
// Send the Customer's message (PIN, "we missed you") at once.
const sendNow = () =>
  after(() => runDueJobs(jobHandlers).then(() => undefined));
/** Pesos as typed ("624" or "₱624.00") to centavos; undefined when blank. */
const cash = (fd: FormData) => {
  const raw = text(fd, "cash");
  if (!raw) return undefined;
  return parseMoney(raw) ?? Number.NaN;
};
const done = (): DispatchFormState => {
  refresh();
  return { errors: {}, saved: true };
};

/** Send a picked Order out with a Rider (ADR 0011). */
export async function sendOutAction(
  orderId: string,
  _prev: DispatchFormState,
  fd: FormData
): Promise<DispatchFormState> {
  const staff = await requireStaff("dispatch", "/admin/dispatch");
  const riderId = text(fd, "riderId");
  const result = await dispatchOrder(orderId, riderId, {
    type: "staff",
    id: staff.id,
  });
  if (!result.ok) {
    return {
      errors: {
        form:
          result.reason === "not_a_rider"
            ? "Choose a Rider."
            : "This Order is not ready to go out. Reload.",
      },
    };
  }
  await recordAudits([
    {
      staffId: staff.id,
      action: "dispatch",
      entity: "order",
      entityId: orderId,
      after: { riderId },
    },
  ]);
  sendNow();
  return done();
}

/** The Dispatcher marks it delivered without the PIN, with a reason. */
export async function deliverWithoutPinAction(
  orderId: string,
  _prev: DispatchFormState,
  fd: FormData
): Promise<DispatchFormState> {
  const staff = await requireStaff("dispatch", "/admin/dispatch");
  const reason = text(fd, "reason");
  const result = await deliverWithoutPin(
    orderId,
    { type: "staff", id: staff.id },
    reason,
    { cashCents: cash(fd), note: text(fd, "note") }
  );
  if (!result.ok) return { errors: result.errors };
  await recordAudits([
    {
      staffId: staff.id,
      action: "delivered_without_pin",
      entity: "order",
      entityId: orderId,
      after: { reason },
    },
  ]);
  return done();
}

/** The Rider at the door: PIN, and the cash for a cash-on-delivery Order. */
export async function deliveredAction(
  orderId: string,
  _prev: DispatchFormState,
  fd: FormData
): Promise<DispatchFormState> {
  const rider = await requireStaff("delivery", "/admin/deliveries");
  const result = await completeDelivery(orderId, rider.id, {
    pin: text(fd, "pin"),
    cashCents: cash(fd),
    note: text(fd, "note"),
  });
  if (!result.ok) return { errors: result.errors };
  await recordAudits([
    {
      staffId: rider.id,
      action: "delivered",
      entity: "order",
      entityId: orderId,
      after: { cash: text(fd, "cash") || null },
    },
  ]);
  return done();
}

/** The Rider could not deliver; the Customer is told. */
export async function failedAction(
  orderId: string,
  _prev: DispatchFormState,
  fd: FormData
): Promise<DispatchFormState> {
  const rider = await requireStaff("delivery", "/admin/deliveries");
  const why = [text(fd, "reason"), text(fd, "detail")]
    .filter(Boolean)
    .join(": ");
  const result = await failDelivery(orderId, rider.id, why);
  if (!result.ok) return { errors: result.errors };
  await recordAudits([
    {
      staffId: rider.id,
      action: "delivery_failed",
      entity: "order",
      entityId: orderId,
      after: { reason: why },
    },
  ]);
  sendNow();
  return done();
}

/** The Dispatcher's count of a Rider's cash for a day. */
export async function countCashAction(
  riderId: string,
  day: string,
  _prev: DispatchFormState,
  fd: FormData
): Promise<DispatchFormState> {
  const staff = await requireStaff("dispatch", "/admin/cash");
  const counted = parseMoney(text(fd, "counted"));
  const result = await recordCashHandover(
    riderId,
    day,
    counted ?? Number.NaN,
    staff.id,
    text(fd, "note")
  );
  if (!result.ok) return { errors: result.errors };
  await recordAudits([
    {
      staffId: staff.id,
      action: "cash_counted",
      entity: "cash_handover",
      entityId: `${riderId}:${day}`,
      after: { counted, shortCents: result.shortCents },
    },
  ]);
  return done();
}
