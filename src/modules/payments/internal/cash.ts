import { manilaDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

// Cash Handovers (ADR 0011). shortcut: the day's cash comes from Payments
// joined to their Orders (Rider, delivery time) through Prisma relations.

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A Manila date's 24 hours, and the date as stored in a DATE column. */
function manilaDay(day: string) {
  const start = new Date(`${day}T00:00:00+08:00`);
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    date: new Date(`${day}T00:00:00Z`),
  };
}

const collectedOn = (day: string, riderId?: string) => {
  const { start, end } = manilaDay(day);
  return {
    method: "cod" as const,
    status: "cod_collected" as const,
    order: { riderId, deliveredAt: { gte: start, lt: end } },
  };
};

/** One Rider's cash-on-delivery Orders on a Manila date, and its count. */
export async function riderCashDay(riderId: string, day: string) {
  const payments = await db.payment.findMany({
    where: collectedOn(day, riderId),
    orderBy: { order: { deliveredAt: "asc" } },
    select: {
      capturedCents: true,
      collectedNote: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          totalCents: true,
          finalTotalCents: true,
        },
      },
    },
  });
  const orders = payments.map((p) => ({
    orderId: p.order.id,
    orderNo: p.order.orderNo,
    dueCents: p.order.finalTotalCents ?? p.order.totalCents,
    collectedCents: p.capturedCents,
    note: p.collectedNote,
  }));
  const recordedCents = orders.reduce((sum, o) => sum + o.collectedCents, 0);
  const handover = await db.cashHandover.findUnique({
    where: { riderId_day: { riderId, day: manilaDay(day).date } },
    select: {
      recordedCents: true,
      countedCents: true,
      note: true,
      createdAt: true,
      countedBy: { select: { name: true } },
    },
  });
  return {
    orders,
    recordedCents,
    handover: handover
      ? {
          countedCents: handover.countedCents,
          shortCents: handover.recordedCents - handover.countedCents,
          countedBy: handover.countedBy.name,
          note: handover.note,
          at: handover.createdAt,
        }
      : null,
  };
}

/** Every Rider who took cash on a Manila date, with their count if done. */
export async function listCashDay(day: string) {
  const payments = await db.payment.findMany({
    where: collectedOn(day),
    select: {
      capturedCents: true,
      order: {
        select: { riderId: true, rider: { select: { name: true } } },
      },
    },
  });
  const riders = new Map<
    string,
    {
      riderId: string;
      riderName: string;
      orderCount: number;
      recordedCents: number;
    }
  >();
  for (const p of payments) {
    const id = p.order.riderId;
    if (!id) continue;
    const row = riders.get(id) ?? {
      riderId: id,
      riderName: p.order.rider?.name ?? "",
      orderCount: 0,
      recordedCents: 0,
    };
    row.orderCount++;
    row.recordedCents += p.capturedCents;
    riders.set(id, row);
  }
  const counted = new Map(
    (
      await db.cashHandover.findMany({
        where: { day: manilaDay(day).date },
        select: { riderId: true, countedCents: true },
      })
    ).map((h) => [h.riderId, h.countedCents])
  );
  return [...riders.values()]
    .sort((a, b) => a.riderName.localeCompare(b.riderName))
    .map((r) => ({ ...r, countedCents: counted.get(r.riderId) ?? null }));
}

/**
 * The Dispatcher's count of a Rider's cash for a day (ADR 0011). Less than
 * the Rider recorded needs a note; a day is counted once. Form result.
 */
export async function recordCashHandover(
  riderId: string,
  day: string,
  countedCents: number,
  countedById: string,
  note: string
): Promise<
  | { ok: true; shortCents: number }
  | { ok: false; errors: { counted?: string; note?: string; form?: string } }
> {
  if (!DAY.test(day)) return { ok: false, errors: { form: "Choose a day." } };
  if (!Number.isInteger(countedCents) || countedCents < 0) {
    return { ok: false, errors: { counted: "Enter the cash you counted." } };
  }
  const { recordedCents } = await riderCashDay(riderId, day);
  const shortCents = recordedCents - countedCents;
  const why = note.trim() || null;
  if (shortCents > 0 && !why) {
    return {
      ok: false,
      errors: {
        note: `${formatMoney(shortCents)} is missing. Say what happened.`,
      },
    };
  }
  const { count } = await db.cashHandover.createMany({
    data: {
      riderId,
      day: manilaDay(day).date,
      recordedCents,
      countedCents,
      countedById,
      note: why,
    },
    skipDuplicates: true,
  });
  return count === 1
    ? { ok: true, shortCents }
    : {
        ok: false,
        errors: { form: "This Rider's cash for the day is already counted." },
      };
}

type CashErrors = {
  counted?: string;
  cash?: string;
  note?: string;
  form?: string;
};

/**
 * A day's count was wrong: record the right one, saying why. Who counted
 * becomes who corrected it; the audit log keeps both.
 */
export async function correctCashHandover(
  riderId: string,
  day: string,
  countedCents: number,
  correctedById: string,
  note: string
): Promise<{ ok: true } | { ok: false; errors: CashErrors }> {
  if (!DAY.test(day)) return { ok: false, errors: { form: "Choose a day." } };
  if (!Number.isInteger(countedCents) || countedCents < 0) {
    return { ok: false, errors: { counted: "Enter the cash you counted." } };
  }
  const why = note.trim();
  if (!why)
    return { ok: false, errors: { note: "Say why the count changes." } };
  const { count } = await db.cashHandover.updateMany({
    where: { riderId, day: manilaDay(day).date },
    data: { countedCents, countedById: correctedById, note: why },
  });
  return count
    ? { ok: true }
    : { ok: false, errors: { form: "This day is not counted yet." } };
}

/**
 * The Rider recorded the wrong cash for an Order: fix it, saying why. If
 * that Rider's day is already counted, its recorded total follows, so the
 * short or over shows against the count (ADR 0023).
 */
export async function correctCollectedCash(
  orderId: string,
  cashCents: number,
  note: string
): Promise<{ ok: true } | { ok: false; errors: CashErrors }> {
  if (!Number.isInteger(cashCents) || cashCents < 0) {
    return { ok: false, errors: { cash: "Enter the cash taken." } };
  }
  const why = note.trim();
  if (!why) return { ok: false, errors: { note: "Say why the cash changes." } };
  const payment = await db.payment.findFirst({
    where: { orderId, method: "cod", status: "cod_collected" },
    select: {
      id: true,
      capturedCents: true,
      refundedCents: true,
      order: { select: { riderId: true, deliveredAt: true } },
    },
  });
  const { riderId, deliveredAt } = payment?.order ?? {};
  if (!payment || !riderId || !deliveredAt) {
    return {
      ok: false,
      errors: { form: "No cash was recorded for this Order." },
    };
  }
  if (cashCents < payment.refundedCents) {
    return {
      ok: false,
      errors: {
        cash: `${formatMoney(payment.refundedCents)} was given back: enter at least that.`,
      },
    };
  }
  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: { capturedCents: cashCents, collectedNote: why },
    }),
    db.cashHandover.updateMany({
      where: { riderId, day: manilaDay(manilaDate(deliveredAt)).date },
      data: { recordedCents: { increment: cashCents - payment.capturedCents } },
    }),
  ]);
  return { ok: true };
}
