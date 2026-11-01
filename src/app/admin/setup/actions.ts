"use server";

import { refresh } from "next/cache";

import { addDays, fromManilaInput } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import {
  addSlotTemplate,
  closeSlots,
  getDefaultHubId,
  setHubStatus,
  removeSlotTemplate,
  setSlotCapacity,
  setTemplateCapacity,
  updateZoneFees,
} from "@/modules/delivery";
import { recordAudits, requireStaff } from "@/modules/identity";

export type SetupFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const whole = (fd: FormData, key: string) =>
  text(fd, key) === "" ? Number.NaN : Number(text(fd, key));

async function admin() {
  return requireStaff("setup", "/admin/setup");
}

async function done(
  staffId: string,
  action: string,
  entity: string,
  entityId: string,
  after: unknown
): Promise<SetupFormState> {
  await recordAudits([{ staffId, action, entity, entityId, after }]);
  refresh();
  return { errors: {}, saved: true };
}

/** What a Zone charges (ADR 0012): pesos as typed; blank free threshold = never. */
export async function zoneFeesAction(
  zoneId: string,
  _prev: SetupFormState,
  fd: FormData
): Promise<SetupFormState> {
  const staff = await admin();
  const money = (key: string) => parseMoney(text(fd, key)) ?? Number.NaN;
  const fees = {
    deliveryFeeCents: money("deliveryFee"),
    freeDeliveryOverCents: text(fd, "freeDeliveryOver")
      ? money("freeDeliveryOver")
      : null,
    minOrderCents: money("minOrder"),
  };
  const result = await updateZoneFees(zoneId, fees);
  if (!result.ok) return { errors: result.errors };
  return done(staff.id, "update", "zone", zoneId, fees);
}

/** A new window in the weekly schedule. */
export async function addWindowAction(
  _prev: SetupFormState,
  fd: FormData
): Promise<SetupFormState> {
  const staff = await admin();
  const hubId = await getDefaultHubId();
  if (!hubId) return { errors: { form: "No Hub is open." } };
  const input = {
    weekday: whole(fd, "weekday"),
    start: text(fd, "start"),
    end: text(fd, "end"),
    capacity: whole(fd, "capacity"),
  };
  const result = await addSlotTemplate(hubId, input);
  if (!result.ok) return { errors: result.errors };
  return done(staff.id, "create", "slot_template", hubId, input);
}

/** A window's capacity, or removing it (for days not yet made). */
export async function windowAction(
  templateId: string,
  _prev: SetupFormState,
  fd: FormData
): Promise<SetupFormState> {
  const staff = await admin();
  if (fd.get("remove") === "1") {
    await removeSlotTemplate(templateId);
    return done(staff.id, "delete", "slot_template", templateId, null);
  }
  const capacity = whole(fd, "capacity");
  const result = await setTemplateCapacity(templateId, capacity);
  if (!result.ok) return { errors: result.errors };
  return done(staff.id, "update", "slot_template", templateId, { capacity });
}

/** Resize or close one Slot. */
export async function slotCapacityAction(
  slotId: string,
  _prev: SetupFormState,
  fd: FormData
): Promise<SetupFormState> {
  const staff = await admin();
  const capacity = whole(fd, "capacity");
  const result = await setSlotCapacity(slotId, capacity);
  if (!result.ok) return { errors: result.errors };
  return done(staff.id, "update", "slot", slotId, { capacity });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The Hub's notice across the shop and whether GCash and card are on
 * (docs/runbook.md, 3 and 4a).
 */
export async function hubStatusAction(
  _prev: SetupFormState,
  fd: FormData
): Promise<SetupFormState> {
  const staff = await admin();
  const hubId = await getDefaultHubId();
  if (!hubId) return { errors: { form: "There is no Hub yet." } };
  const notice = text(fd, "notice");
  if (notice.length > 200) {
    return { errors: { notice: "Keep the notice under 200 characters." } };
  }
  const until = text(fd, "until") ? fromManilaInput(text(fd, "until")) : null;
  if (until && Number.isNaN(until.getTime())) {
    return { errors: { until: "Choose a date and time." } };
  }
  const status = {
    notice: notice || null,
    noticeUntil: until,
    onlinePaused: fd.get("onlinePaused") === "on",
  };
  await setHubStatus(hubId, status);
  return done(staff.id, "status", "hub", hubId, status);
}

/** Every Slot from one Manila date to another takes no new Orders. */
export async function closeSlotsAction(
  _prev: SetupFormState,
  fd: FormData
): Promise<SetupFormState> {
  const staff = await admin();
  const hubId = await getDefaultHubId();
  if (!hubId) return { errors: { form: "There is no Hub yet." } };
  const from = text(fd, "from");
  const to = text(fd, "to");
  if (!DATE.test(from) || !DATE.test(to) || to < from) {
    return { errors: { form: "Choose the first and the last day to close." } };
  }
  const closed = await closeSlots(
    hubId,
    new Date(`${from}T00:00:00+08:00`),
    addDays(new Date(`${to}T00:00:00+08:00`), 1)
  );
  return done(staff.id, "close_slots", "hub", hubId, { from, to, closed });
}
