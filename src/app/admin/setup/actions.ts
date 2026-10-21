"use server";

import { refresh } from "next/cache";

import { parseMoney } from "@/lib/money";
import {
  addSlotTemplate,
  getDefaultHubId,
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
