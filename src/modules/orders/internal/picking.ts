import { randomBytes } from "node:crypto";

import type {
  OrderLineStatus,
  OrderStatus,
  SubstitutionPreference,
  SubstitutionResponse,
} from "@/generated/prisma/enums";
import { addMinutes } from "@/lib/dates";
import { db } from "@/lib/db";
import { getProductSummaries } from "@/modules/catalog";
import { enqueueJob } from "@/modules/jobs";

import { transitionOrder, type Actor } from "./status";

// shortcut: like read.ts, the Pick List reads Product and Category rows
// through Prisma relations for names and aisle order.

/** The Customer's time to refuse a "pick a similar item" swap (ADR 0010). */
export const SUBSTITUTION_WINDOW_MINUTES = 10;
/** Job that asks the Customer about a Substitution. */
export const SUBSTITUTION_ASKED_JOB = "order.substitution_asked";
// A weighed pack may be this much over its ordered weight (docs/03 section 8).
const OVER_WEIGHT = 1.1;

export type SubstitutionAnswer =
  "waiting" | "accepted" | "refused" | "auto_accepted";

export type PickLine = {
  id: string;
  productId: string;
  name: string;
  orderedQty: number;
  weighed: boolean;
  orderedWeightGrams: number | null;
  fulfilledQty: number | null;
  finalWeightGrams: number | null;
  status: OrderLineStatus;
  preference: SubstitutionPreference;
  preferred: { id: string; name: string } | null;
  /** The Customer's Picker Note. */
  note: string | null;
  substitution: {
    name: string;
    quantity: number;
    priceCents: number;
    answer: SubstitutionAnswer;
    windowEndsAt: Date | null;
  } | null;
};

const answerOf = (response: SubstitutionResponse | null): SubstitutionAnswer =>
  response === "rejected" ? "refused" : (response ?? "waiting");

/** An Order's Pick List: its lines in Category order (ADR 0010). */
export async function getPickList(orderNo: string): Promise<{
  id: string;
  orderNo: string;
  status: OrderStatus;
  slot: { startsAt: Date; endsAt: Date };
  lines: PickLine[];
} | null> {
  const order = await db.order.findUnique({
    where: { orderNo },
    select: {
      id: true,
      orderNo: true,
      status: true,
      slot: { select: { startsAt: true, endsAt: true } },
      lines: {
        select: {
          id: true,
          productId: true,
          nameSnapshot: true,
          orderedQty: true,
          orderedWeightGrams: true,
          fulfilledQty: true,
          finalWeightGrams: true,
          status: true,
          substitutionPreference: true,
          preferredProduct: { select: { id: true, name: true, brand: true } },
          note: true,
          product: {
            select: {
              category: {
                select: {
                  sortOrder: true,
                  parent: { select: { sortOrder: true } },
                },
              },
            },
          },
          substitutions: {
            take: 1,
            select: {
              quantity: true,
              priceCents: true,
              customerResponse: true,
              windowEndsAt: true,
              substituteProduct: { select: { name: true, brand: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return null;
  const aisle = (l: (typeof order.lines)[number]) => {
    const c = l.product.category;
    return c.parent ? [c.parent.sortOrder, c.sortOrder] : [c.sortOrder, -1];
  };
  const lines = [...order.lines].sort((a, b) => {
    const [pa, ca] = aisle(a);
    const [pb, cb] = aisle(b);
    return pa - pb || ca - cb || a.nameSnapshot.localeCompare(b.nameSnapshot);
  });
  const named = (p: { name: string; brand: string | null }) =>
    p.brand ? `${p.brand} ${p.name}` : p.name;
  return {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    slot: order.slot,
    lines: lines.map((l) => {
      const sub = l.substitutions[0];
      return {
        id: l.id,
        productId: l.productId,
        name: l.nameSnapshot,
        orderedQty: l.orderedQty,
        weighed: l.orderedWeightGrams !== null,
        orderedWeightGrams: l.orderedWeightGrams,
        fulfilledQty: l.fulfilledQty,
        finalWeightGrams: l.finalWeightGrams,
        status: l.status,
        preference: l.substitutionPreference,
        preferred: l.preferredProduct
          ? { id: l.preferredProduct.id, name: named(l.preferredProduct) }
          : null,
        note: l.note,
        substitution: sub
          ? {
              name: named(sub.substituteProduct),
              quantity: sub.quantity,
              priceCents: sub.priceCents,
              answer: answerOf(sub.customerResponse),
              windowEndsAt: sub.windowEndsAt,
            }
          : null,
      };
    }),
  };
}

type PickErrors = { found?: string; grams?: string; form?: string };

/**
 * What the Picker found for one line: pieces, or a weighed pack's grams
 * (0 marks it short). A form result (ADR 0009).
 */
export async function recordPick(
  lineId: string,
  { found, grams }: { found?: number; grams?: number }
): Promise<{ ok: true } | { ok: false; errors: PickErrors }> {
  const line = await db.orderLine.findUnique({
    where: { id: lineId },
    select: {
      orderedQty: true,
      orderedWeightGrams: true,
      order: { select: { status: true } },
      _count: { select: { substitutions: true } },
    },
  });
  if (!line || line.order.status !== "picking") {
    return { ok: false, errors: { form: "Start picking this Order first." } };
  }
  if (line._count.substitutions > 0) {
    return {
      ok: false,
      errors: { found: "This line already has a substitute." },
    };
  }
  if (line.orderedWeightGrams !== null) {
    if (!Number.isInteger(grams) || grams! < 0) {
      return { ok: false, errors: { grams: "Enter the weight in grams." } };
    }
    if (grams! > line.orderedWeightGrams * OVER_WEIGHT) {
      return {
        ok: false,
        errors: {
          grams: `More than 10% over: repack to about ${line.orderedWeightGrams} g.`,
        },
      };
    }
    await db.orderLine.update({
      where: { id: lineId },
      data: {
        finalWeightGrams: grams,
        fulfilledQty: grams! > 0 ? line.orderedQty : 0,
        status: grams! > 0 ? "picked" : "short",
      },
    });
    return { ok: true };
  }
  if (!Number.isInteger(found) || found! < 0 || found! > line.orderedQty) {
    return {
      ok: false,
      errors: { found: `Enter 0 to ${line.orderedQty}.` },
    };
  }
  await db.orderLine.update({
    where: { id: lineId },
    data: {
      fulfilledQty: found,
      status: found === line.orderedQty ? "picked" : "short",
    },
  });
  return { ok: true };
}

export type ProposeResult =
  | { ok: true; asked: boolean }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_picking"
        | "weighed"
        | "no_substitute"
        | "same_product"
        | "not_their_choice"
        | "already_substituted"
        | "nothing_missing";
    };

/**
 * The Picker stands in another Product for the pieces not found (ADR
 * 0010). "Pick a similar item" asks the Customer, who has the Substitution
 * Window to refuse; their own chosen Product is accepted at once.
 */
export async function proposeSubstitution(
  lineId: string,
  staffId: string,
  substituteProductId: string,
  now = new Date()
): Promise<ProposeResult> {
  const line = await db.orderLine.findUnique({
    where: { id: lineId },
    select: {
      productId: true,
      orderedQty: true,
      orderedWeightGrams: true,
      fulfilledQty: true,
      substitutionPreference: true,
      preferredProductId: true,
      order: { select: { status: true } },
      _count: { select: { substitutions: true } },
    },
  });
  if (!line) return { ok: false, reason: "not_found" };
  if (line.order.status !== "picking")
    return { ok: false, reason: "not_picking" };
  if (line.orderedWeightGrams !== null) return { ok: false, reason: "weighed" };
  if (line.substitutionPreference === "none") {
    return { ok: false, reason: "no_substitute" };
  }
  if (substituteProductId === line.productId) {
    return { ok: false, reason: "same_product" };
  }
  const asked = line.substitutionPreference === "allow";
  if (!asked && substituteProductId !== line.preferredProductId) {
    return { ok: false, reason: "not_their_choice" };
  }
  if (line._count.substitutions > 0) {
    return { ok: false, reason: "already_substituted" };
  }
  const found = line.fulfilledQty ?? 0;
  if (found >= line.orderedQty) return { ok: false, reason: "nothing_missing" };
  const [product] = await getProductSummaries([substituteProductId]);
  if (!product) return { ok: false, reason: "not_found" };

  await db.$transaction(async (tx) => {
    const sub = await tx.substitution.create({
      data: {
        orderLineId: lineId,
        substituteProductId,
        priceCents: product.priceCents,
        quantity: line.orderedQty - found,
        proposedById: staffId,
        ...(asked
          ? {
              token: randomBytes(24).toString("base64url"),
              windowEndsAt: addMinutes(now, SUBSTITUTION_WINDOW_MINUTES),
            }
          : { customerResponse: "auto_accepted", respondedAt: now }),
      },
      select: { id: true },
    });
    await tx.orderLine.update({
      where: { id: lineId },
      data: { fulfilledQty: found, status: "substituted" },
    });
    if (asked) {
      await enqueueJob(tx, SUBSTITUTION_ASKED_JOB, { substitutionId: sub.id });
    }
  });
  return { ok: true, asked };
}

/**
 * The Customer's answer from the link. "too_late" once the window has
 * ended (silence was a yes); null for an unknown link.
 */
export async function answerSubstitution(
  token: string,
  accept: boolean,
  now = new Date()
): Promise<"accepted" | "refused" | "too_late" | null> {
  const sub = await db.substitution.findUnique({
    where: { token },
    select: {
      id: true,
      orderLineId: true,
      customerResponse: true,
      windowEndsAt: true,
    },
  });
  if (!sub) return null;
  if (sub.customerResponse) {
    const answer = answerOf(sub.customerResponse);
    return answer === "auto_accepted"
      ? "too_late"
      : (answer as "accepted" | "refused");
  }
  if (!sub.windowEndsAt || sub.windowEndsAt <= now) {
    await db.substitution.updateMany({
      where: { id: sub.id, customerResponse: null },
      data: { customerResponse: "auto_accepted", respondedAt: now },
    });
    return "too_late";
  }
  return db.$transaction(async (tx) => {
    const { count } = await tx.substitution.updateMany({
      where: { id: sub.id, customerResponse: null },
      data: {
        customerResponse: accept ? "accepted" : "rejected",
        respondedAt: now,
      },
    });
    if (count === 0) return accept ? "accepted" : "refused";
    if (!accept) {
      await tx.orderLine.update({
        where: { id: sub.orderLineId },
        data: { status: "short" },
      });
    }
    return accept ? "accepted" : "refused";
  });
}

/**
 * Picking is done: once every Substitution is answered or its window has
 * ended (silence is a yes), the Order moves to picked and its Final Total
 * is set (ADR 0008, 0010).
 */
export async function finishPicking(
  orderId: string,
  actor: Actor,
  now = new Date()
): Promise<
  | { ok: true }
  | { ok: false; reason: "waiting_for_customer"; until: Date }
  | { ok: false; reason: "not_picking" }
> {
  const open = await db.substitution.findFirst({
    where: {
      orderLine: { orderId },
      customerResponse: null,
      windowEndsAt: { gt: now },
    },
    orderBy: { windowEndsAt: "desc" },
    select: { windowEndsAt: true },
  });
  if (open) {
    return {
      ok: false,
      reason: "waiting_for_customer",
      until: open.windowEndsAt!,
    };
  }
  await db.substitution.updateMany({
    where: { orderLine: { orderId }, customerResponse: null },
    data: { customerResponse: "auto_accepted", respondedAt: now },
  });
  const moved = await transitionOrder(orderId, "picked", actor, undefined, {
    from: ["picking"],
  });
  return moved ? { ok: true } : { ok: false, reason: "not_picking" };
}

/** What the Customer's answer page and the notice show. */
export async function getSubstitution(
  where: { token: string } | { id: string }
) {
  const sub = await db.substitution.findUnique({
    where,
    select: {
      id: true,
      token: true,
      quantity: true,
      priceCents: true,
      customerResponse: true,
      windowEndsAt: true,
      substituteProduct: { select: { name: true, brand: true } },
      orderLine: {
        select: {
          nameSnapshot: true,
          orderedQty: true,
          fulfilledQty: true,
          unitPriceCents: true,
          order: {
            select: {
              id: true,
              orderNo: true,
              contactPhone: true,
              customer: { select: { email: true, lang: true } },
            },
          },
        },
      },
    },
  });
  if (!sub) return null;
  const { substituteProduct: p, orderLine: l } = sub;
  return {
    id: sub.id,
    orderId: l.order.id,
    orderNo: l.order.orderNo,
    email: l.order.customer.email,
    lang: l.order.customer.lang,
    phone: l.order.contactPhone,
    ordered: { name: l.nameSnapshot, quantity: l.orderedQty },
    substitute: {
      name: p.brand ? `${p.brand} ${p.name}` : p.name,
      quantity: sub.quantity,
      // What the Customer pays per piece: the lower price (ADR 0010).
      unitPriceCents: Math.min(sub.priceCents, l.unitPriceCents),
    },
    token: sub.token,
    answer: answerOf(sub.customerResponse),
    windowEndsAt: sub.windowEndsAt,
  };
}
