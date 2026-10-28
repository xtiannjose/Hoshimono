import type { Prisma } from "@/generated/prisma/client";
import type { ClaimReason, ClaimStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { chargedLine } from "@/modules/pricing";

import { checkPhotos, storePhotos, type PhotoProblem } from "./photos";
import { chargedUnits, claimValue, type ClaimLine } from "./value";

// Filing Freshness Claims (ADR 0016). shortcut: reads Orders and Order
// Lines through relations rather than the orders module.

export const CLAIM_WINDOW_HOURS = 24;
const HOUR = 60 * 60 * 1000;
const PHOTO_NEEDED: ClaimReason[] = ["not_fresh", "damaged"];

const orderSelect = {
  id: true,
  orderNo: true,
  customerId: true,
  status: true,
  deliveredAt: true,
  discountCents: true,
  lines: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      nameSnapshot: true,
      lineTotalCents: true,
      orderedQty: true,
      fulfilledQty: true,
      orderedWeightGrams: true,
      finalWeightGrams: true,
      claim: { select: { status: true } },
      substitutions: {
        take: 1,
        select: { quantity: true, priceCents: true, customerResponse: true },
      },
    },
  },
} satisfies Prisma.OrderSelect;

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/** Each line as charged after picking, and what all of it is worth. */
function valued(order: OrderRow) {
  const lines = order.lines.map((l): ClaimLine => {
    const sub = l.substitutions[0];
    return {
      lineTotalCents: l.lineTotalCents,
      orderedQty: l.orderedQty,
      fulfilledQty: l.fulfilledQty,
      orderedWeightGrams: l.orderedWeightGrams,
      finalWeightGrams: l.finalWeightGrams,
      substitute: sub
        ? {
            quantity: sub.quantity,
            unitPriceCents: sub.priceCents,
            accepted: sub.customerResponse !== "rejected",
          }
        : null,
    };
  });
  const charged = lines.map(chargedLine);
  return order.lines.map((l, i) => {
    const units = chargedUnits(lines[i]);
    return {
      row: l,
      weighed: l.orderedWeightGrams !== null,
      units,
      worth: (claimed: number) =>
        claimValue({ charged, discountCents: order.discountCents }, i, {
          units: claimed,
          chargedUnits: units,
        }),
    };
  });
}

const windowEnds = (deliveredAt: Date) =>
  new Date(deliveredAt.getTime() + CLAIM_WINDOW_HOURS * HOUR);

export type ClaimableLine = {
  id: string;
  name: string;
  weighed: boolean;
  /** Items that can be claimed (charged after picking). */
  units: number;
  /** What claiming all of them is worth. */
  amountCents: number;
  claim: { status: ClaimStatus } | null;
};

/**
 * A Customer's delivered Order as the claim form needs it, or null when it
 * is not theirs. `open` is false outside the 24 hours or before delivery.
 */
export async function claimableLines(
  orderNo: string,
  customerId: string,
  now = new Date()
): Promise<{
  orderId: string;
  orderNo: string;
  open: boolean;
  windowEndsAt: Date | null;
  lines: ClaimableLine[];
} | null> {
  const order = await db.order.findFirst({
    where: { orderNo, customerId },
    select: orderSelect,
  });
  if (!order) return null;
  const ends =
    order.status === "delivered" && order.deliveredAt
      ? windowEnds(order.deliveredAt)
      : null;
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    open: ends !== null && now < ends,
    windowEndsAt: ends,
    lines: valued(order).map((l) => ({
      id: l.row.id,
      name: l.row.nameSnapshot,
      weighed: l.weighed,
      units: l.units,
      amountCents: l.worth(l.units),
      claim: l.row.claim,
    })),
  };
}

export type ClaimInput = {
  orderLineId: string;
  reason: ClaimReason;
  /** Ignored for a weighed line, which is claimed whole. */
  units: number;
  note: string;
  photos: Buffer[];
};

/** What stops a claim; the shop words it in its language (ADR 0019). */
export type ClaimProblem =
  | "not_found"
  | "not_delivered"
  | "window_passed"
  | "already_reported"
  | "not_charged"
  | "bad_units"
  | "note_too_long"
  | "photo_needed"
  | PhotoProblem;

type Errors = Partial<
  Record<"form" | "units" | "note" | "photos", ClaimProblem>
>;

/**
 * File a claim on one delivered Order Line, within 24 hours (ADR 0016). A
 * form result (ADR 0009): its id, or what to fix.
 */
export async function fileClaim(
  customerId: string,
  input: ClaimInput,
  now = new Date()
): Promise<{ ok: true; id: string } | { ok: false; errors: Errors }> {
  const refuse = (form: ClaimProblem) => ({
    ok: false as const,
    errors: { form },
  });
  if (!isUuid(input.orderLineId)) return refuse("not_found");
  const order = await db.order.findFirst({
    where: { customerId, lines: { some: { id: input.orderLineId } } },
    select: orderSelect,
  });
  if (!order) return refuse("not_found");
  if (order.status !== "delivered" || !order.deliveredAt)
    return refuse("not_delivered");
  if (now >= windowEnds(order.deliveredAt)) return refuse("window_passed");
  const line = valued(order).find((l) => l.row.id === input.orderLineId)!;
  if (line.row.claim) return refuse("already_reported");
  if (line.units === 0) return refuse("not_charged");

  const errors: Errors = {};
  const units = line.weighed ? 1 : input.units;
  if (!Number.isInteger(units) || units < 1 || units > line.units)
    errors.units = "bad_units";
  const note = input.note.trim();
  if (note.length > 500) errors.note = "note_too_long";
  const photoProblem = await checkPhotos(input.photos);
  if (photoProblem) errors.photos = photoProblem;
  else if (PHOTO_NEEDED.includes(input.reason) && input.photos.length === 0)
    errors.photos = "photo_needed";
  if (Object.keys(errors).length) return { ok: false, errors };

  let id: string;
  try {
    ({ id } = await db.freshnessClaim.create({
      data: {
        orderId: order.id,
        orderLineId: line.row.id,
        customerId,
        reason: input.reason,
        units,
        note,
        claimedCents: line.worth(units),
      },
      select: { id: true },
    }));
  } catch (error) {
    // Two taps at once: the unique Order Line keeps one claim.
    if ((error as { code?: string }).code === "P2002")
      return refuse("already_reported");
    throw error;
  }
  if (input.photos.length > 0) {
    const photoUrls = await storePhotos(id, input.photos);
    await db.freshnessClaim.update({ where: { id }, data: { photoUrls } });
  }
  return { ok: true, id };
}

/** A Customer's claims on one Order, for the Order page. */
export async function listOrderClaims(orderId: string, customerId: string) {
  if (!isUuid(orderId)) return [];
  return db.freshnessClaim.findMany({
    where: { orderId, customerId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      reason: true,
      units: true,
      status: true,
      claimedCents: true,
      resolvedCents: true,
      payback: true,
      decisionNote: true,
      voucher: { select: { code: true } },
      refund: { select: { amountCents: true } },
      orderLine: { select: { nameSnapshot: true } },
    },
  });
}

/** Claims filed in a time range, for the daily report. */
export function countClaims(range: { gte: Date; lt: Date }): Promise<number> {
  return db.freshnessClaim.count({ where: { createdAt: range } });
}
