import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** A chosen Slot is kept for the cart this long (PRD CHK-2). */
export const SLOT_HOLD_MINUTES = 10;
/**
 * A Slot stops taking Orders this long before it starts, leaving time to
 * pick and travel. Assumption until operations set it.
 */
export const SLOT_CUTOFF_MINUTES = 90;
/** Bookable this many days ahead, the same window listSlots shows. */
const BOOKING_DAYS = 7;

export type SlotState = "open" | "few" | "full";

export type SlotOption = {
  id: string;
  /** Manila calendar date, such as "2026-10-19". */
  date: string;
  startsAt: Date;
  endsAt: Date;
  state: SlotState;
  /** This cart holds a place in it. */
  held: boolean;
};

export type HoldResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; reason: "full" | "closed" | "not_found" };

type SlotRequest = {
  slotId: string;
  cartId: string;
  /** The Hub that serves the Order's address; Slots of other Hubs are refused. */
  hubId: string;
  now: Date;
};

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

type SlotRow = {
  id: string;
  date: Date;
  starts_at: Date;
  ends_at: Date;
  capacity: number;
  booked: number;
  held_by_others: number;
  mine: boolean;
};

/**
 * Upcoming Slots at a Hub with how full they are. Places left are capacity
 * minus bookings minus other carts' live holds; this cart's own hold counts
 * as its place.
 */
export async function listSlots(
  hubId: string,
  options: { now?: Date; cartId?: string | null; days?: number } = {}
): Promise<SlotOption[]> {
  const now = options.now ?? new Date();
  const cartId = options.cartId ?? null;
  const rows = await db.$queryRaw<SlotRow[]>`
    SELECT s.id, s.date, s.starts_at, s.ends_at, s.capacity, s.booked,
      (SELECT count(*)::int FROM slot_holds h
        WHERE h.slot_id = s.id AND h.expires_at > ${now}
          AND h.cart_id IS DISTINCT FROM ${cartId}::uuid) AS held_by_others,
      EXISTS (SELECT 1 FROM slot_holds h
        WHERE h.slot_id = s.id AND h.expires_at > ${now}
          AND h.cart_id = ${cartId}::uuid) AS mine
    FROM slots s
    WHERE s.hub_id = ${hubId}::uuid
      AND s.starts_at > ${addMinutes(now, SLOT_CUTOFF_MINUTES)}
      AND s.starts_at < ${addMinutes(now, (options.days ?? 7) * 24 * 60)}
    ORDER BY s.starts_at`;
  return rows.map((row) => {
    const left = row.capacity - row.booked - row.held_by_others;
    return {
      id: row.id,
      date: row.date.toISOString().slice(0, 10),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      // "Only a few left" under 20% of capacity (docs/05 SlotPicker).
      state: left <= 0 ? "full" : left * 5 < row.capacity ? "few" : "open",
      held: row.mine,
    };
  });
}

// Locks the Slot row so holds and bookings for it run one at a time; then
// counts live holds by other carts.
// Only a Slot of the Order's Hub, inside the booking window, is found.
async function lockSlot(
  tx: Prisma.TransactionClient,
  { slotId, cartId, hubId, now }: SlotRequest
) {
  const [slot] = await tx.$queryRaw<
    { capacity: number; booked: number; starts_at: Date }[]
  >`
    SELECT capacity, booked, starts_at FROM slots
    WHERE id = ${slotId}::uuid AND hub_id = ${hubId}::uuid
      AND starts_at < ${addMinutes(now, BOOKING_DAYS * 24 * 60)}
    FOR UPDATE`;
  if (!slot) return null;
  const [{ others, mine }] = await tx.$queryRaw<
    { others: number; mine: boolean }[]
  >`
    SELECT count(*) FILTER (WHERE cart_id <> ${cartId}::uuid)::int AS others,
           bool_or(cart_id = ${cartId}::uuid) IS TRUE AS mine
    FROM slot_holds
    WHERE slot_id = ${slotId}::uuid AND expires_at > ${now}`;
  return { ...slot, others, mine, free: slot.capacity - slot.booked - others };
}

/**
 * Hold a place in a Slot for this cart for SLOT_HOLD_MINUTES. A cart holds
 * one Slot at a time, so choosing another replaces the hold.
 */
export async function holdSlot(
  cartId: string,
  slotId: string,
  { hubId, now = new Date() }: { hubId: string; now?: Date }
): Promise<HoldResult> {
  const UUID = /^[0-9a-f-]{36}$/i;
  if (!UUID.test(slotId)) return { ok: false, reason: "not_found" };
  return db.$transaction(async (tx) => {
    const slot = await lockSlot(tx, { slotId, cartId, hubId, now });
    if (!slot) return { ok: false, reason: "not_found" } as const;
    if (slot.starts_at <= addMinutes(now, SLOT_CUTOFF_MINUTES)) {
      return { ok: false, reason: "closed" } as const;
    }
    if (slot.free <= 0) return { ok: false, reason: "full" } as const;
    const expiresAt = addMinutes(now, SLOT_HOLD_MINUTES);
    await tx.$executeRaw`
      INSERT INTO slot_holds (id, slot_id, cart_id, expires_at)
      VALUES (gen_random_uuid(), ${slotId}::uuid, ${cartId}::uuid, ${expiresAt})
      ON CONFLICT (cart_id) DO UPDATE
        SET slot_id = EXCLUDED.slot_id, expires_at = EXCLUDED.expires_at`;
    return { ok: true, expiresAt } as const;
  });
}

/** The cart's live hold, or null. */
export async function getSlotHold(
  cartId: string,
  now = new Date()
): Promise<{ slotId: string; expiresAt: Date } | null> {
  const hold = await db.slotHold.findFirst({
    where: { cartId, expiresAt: { gt: now } },
    select: { slotId: true, expiresAt: true },
  });
  return hold;
}

/**
 * Take a place in a Slot inside the caller's Order transaction (docs/03
 * section 9). A cart with a live hold may book until the Slot starts;
 * otherwise the cutoff applies and a place must be free of other holds.
 * Returns false when the Slot cannot take the Order.
 */
export async function bookSlot(
  tx: Prisma.TransactionClient,
  request: Omit<SlotRequest, "now"> & { now?: Date }
): Promise<boolean> {
  const now = request.now ?? new Date();
  const { slotId, cartId } = request;
  const slot = await lockSlot(tx, { ...request, now });
  if (!slot) return false;
  const closesAt = slot.mine ? now : addMinutes(now, SLOT_CUTOFF_MINUTES);
  if (slot.starts_at <= closesAt || slot.free <= 0) return false;
  await tx.$executeRaw`UPDATE slots SET booked = booked + 1, updated_at = now() WHERE id = ${slotId}::uuid`;
  await tx.$executeRaw`DELETE FROM slot_holds WHERE cart_id = ${cartId}::uuid`;
  return true;
}

/** Give a booked place back, such as when an Order is cancelled. */
export async function releaseSlot(
  tx: Prisma.TransactionClient,
  slotId: string
): Promise<void> {
  await tx.$executeRaw`
    UPDATE slots SET booked = booked - 1, updated_at = now()
    WHERE id = ${slotId}::uuid AND booked > 0`;
}

/** Delete lapsed holds (cron, Batch 2.5). Returns how many went. */
export async function purgeExpiredHolds(now = new Date()): Promise<number> {
  const { count } = await db.slotHold.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  return count;
}
