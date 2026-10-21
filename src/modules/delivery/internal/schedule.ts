import { db } from "@/lib/db";

// The weekly Slot schedule and Zone fees (ADR 0012). Callers check
// requireStaff("setup") first.

/** How many days ahead the cron tick keeps Slots made. */
const SCHEDULE_DAYS = 7;
const MANILA_OFFSET_MINUTES = 8 * 60; // UTC+8 all year
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "8:00 PM" for 1200 minutes after midnight. */
function clock(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = String(minute % 60).padStart(2, "0");
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Make the Slots the weekly schedule calls for, from Manila today for
 * SCHEDULE_DAYS days (cron tick). Existing Slots are never touched, so a
 * schedule change shapes only days not yet made. Returns how many were made.
 */
export async function ensureSlots(now = new Date()): Promise<number> {
  const templates = await db.slotTemplate.findMany({
    where: { hub: { isActive: true } },
  });
  const manila = new Date(now.getTime() + MANILA_OFFSET_MINUTES * 60_000);
  const [y, m, d] = [
    manila.getUTCFullYear(),
    manila.getUTCMonth(),
    manila.getUTCDate(),
  ];
  const slots = [];
  for (let day = 0; day < SCHEDULE_DAYS; day++) {
    const date = new Date(Date.UTC(y, m, d + day));
    for (const t of templates.filter((t) => t.weekday === date.getUTCDay())) {
      const at = (minute: number) =>
        new Date(Date.UTC(y, m, d + day, 0, minute - MANILA_OFFSET_MINUTES));
      slots.push({
        hubId: t.hubId,
        date,
        startsAt: at(t.startMinute),
        endsAt: at(t.endMinute),
        capacity: t.capacity,
      });
    }
  }
  if (slots.length === 0) return 0;
  const { count } = await db.slot.createMany({
    data: slots,
    skipDuplicates: true,
  });
  return count;
}

/** A Hub's weekly schedule, by weekday then start time. */
export async function listSlotTemplates(hubId: string) {
  return db.slotTemplate.findMany({
    where: { hubId },
    orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
    select: {
      id: true,
      weekday: true,
      startMinute: true,
      endMinute: true,
      capacity: true,
    },
  });
}

type ScheduleErrors = {
  start?: string;
  end?: string;
  capacity?: string;
  weekday?: string;
};
type ScheduleResult = { ok: true } | { ok: false; errors: ScheduleErrors };

const capacityError = (capacity: number) =>
  Number.isInteger(capacity) && capacity >= 0 ? null : "Enter 0 or more.";

/** A new window on one weekday, in Manila local time ("08:00" to "10:00"). */
export async function addSlotTemplate(
  hubId: string,
  input: { weekday: number; start: string; end: string; capacity: number }
): Promise<ScheduleResult> {
  const minutes = (text: string) => {
    const match = TIME.exec(text.trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const start = minutes(input.start);
  const end = input.end.trim() === "24:00" ? 1440 : minutes(input.end);
  const errors: ScheduleErrors = {};
  if (
    !Number.isInteger(input.weekday) ||
    input.weekday < 0 ||
    input.weekday > 6
  ) {
    errors.weekday = "Choose a day.";
  }
  if (start === null) errors.start = "Use a time like 08:00.";
  if (end === null) errors.end = "Use a time like 10:00.";
  else if (start !== null && end <= start) errors.end = "End after the start.";
  const capacity = capacityError(input.capacity);
  if (capacity) errors.capacity = capacity;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const { count } = await db.slotTemplate.createMany({
    data: {
      hubId,
      weekday: input.weekday,
      startMinute: start!,
      endMinute: end!,
      capacity: input.capacity,
    },
    skipDuplicates: true,
  });
  return count === 1
    ? { ok: true }
    : {
        ok: false,
        errors: { start: `There is already a window at ${clock(start!)}.` },
      };
}

/** How many Orders a window takes, on days not yet made. */
export async function setTemplateCapacity(
  id: string,
  capacity: number
): Promise<ScheduleResult> {
  const error = capacityError(capacity);
  if (error) return { ok: false, errors: { capacity: error } };
  await db.slotTemplate.updateMany({ where: { id }, data: { capacity } });
  return { ok: true };
}

export async function removeSlotTemplate(id: string): Promise<boolean> {
  const { count } = await db.slotTemplate.deleteMany({ where: { id } });
  return count === 1;
}

/**
 * Resize one Slot, or close it to new Orders (capacity = booked). Never
 * below what is already booked.
 */
export async function setSlotCapacity(
  slotId: string,
  capacity: number
): Promise<ScheduleResult> {
  const error = capacityError(capacity);
  if (error) return { ok: false, errors: { capacity: error } };
  const { count } = await db.slot.updateMany({
    where: { id: slotId, booked: { lte: capacity } },
    data: { capacity },
  });
  if (count === 1) return { ok: true };
  const slot = await db.slot.findUnique({
    where: { id: slotId },
    select: { booked: true },
  });
  return {
    ok: false,
    errors: {
      capacity: slot
        ? `${slot.booked} are booked: at least ${slot.booked}.`
        : "No such Slot.",
    },
  };
}

/** A Hub's Slots from now, for the next SCHEDULE_DAYS days. */
export async function listUpcomingSlots(hubId: string, now = new Date()) {
  return db.slot.findMany({
    where: {
      hubId,
      endsAt: { gt: now },
      startsAt: {
        lt: new Date(now.getTime() + SCHEDULE_DAYS * 24 * 60 * 60_000),
      },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      booked: true,
    },
  });
}

/** Every Zone with its fees, for the admin. */
export async function listZonesForAdmin() {
  return db.zone.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      cities: true,
      barangays: true,
      deliveryFeeCents: true,
      freeDeliveryOverCents: true,
      minOrderCents: true,
    },
  });
}

/** What a Zone charges (ADR 0012); amounts in centavos, null for no free delivery. */
export async function updateZoneFees(
  zoneId: string,
  fees: {
    deliveryFeeCents: number;
    freeDeliveryOverCents: number | null;
    minOrderCents: number;
  }
): Promise<
  | { ok: true }
  | {
      ok: false;
      errors: {
        deliveryFee?: string;
        freeDeliveryOver?: string;
        minOrder?: string;
      };
    }
> {
  const bad = (n: number) => !Number.isInteger(n) || n < 0;
  const errors: {
    deliveryFee?: string;
    freeDeliveryOver?: string;
    minOrder?: string;
  } = {};
  if (bad(fees.deliveryFeeCents)) errors.deliveryFee = "Enter 0 or more.";
  if (fees.freeDeliveryOverCents !== null && bad(fees.freeDeliveryOverCents)) {
    errors.freeDeliveryOver = "Enter 0 or more, or leave it blank.";
  }
  if (bad(fees.minOrderCents)) errors.minOrder = "Enter 0 or more.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  await db.zone.update({ where: { id: zoneId }, data: fees });
  return { ok: true };
}
