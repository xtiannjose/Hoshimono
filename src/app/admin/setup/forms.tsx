"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";
import { WEEKDAYS } from "@/lib/dates";

import { FormMessage } from "../form-message";
import {
  addWindowAction,
  closeSlotsAction,
  hubStatusAction,
  slotCapacityAction,
  windowAction,
  zoneFeesAction,
  type SetupFormState,
} from "./actions";
import { INLINE_FIELD } from "@/components/ui/field-classes";

const initial: SetupFormState = { errors: {} };
const FIELD = `${INLINE_FIELD} tabular-nums`;
const pesos = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2);

export function ZoneFeesForm({
  zoneId,
  name,
  fees,
}: {
  zoneId: string;
  name: string;
  fees: {
    deliveryFeeCents: number;
    freeDeliveryOverCents: number | null;
    minOrderCents: number;
  };
}) {
  const [state, action, pending] = useActionState(
    zoneFeesAction.bind(null, zoneId),
    initial
  );
  return (
    <form
      key={formKey(state)}
      action={action}
      aria-label={`Fees for ${name}`}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="grid gap-1 text-sm font-semibold">
        Delivery fee (₱)
        <input
          name="deliveryFee"
          inputMode="decimal"
          defaultValue={pesos(fees.deliveryFeeCents)}
          className={`${FIELD} w-28`}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Free delivery from (₱, blank for never)
        <input
          name="freeDeliveryOver"
          inputMode="decimal"
          defaultValue={pesos(fees.freeDeliveryOverCents)}
          className={`${FIELD} w-32`}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Order minimum (₱)
        <input
          name="minOrder"
          inputMode="decimal"
          defaultValue={pesos(fees.minOrderCents)}
          className={`${FIELD} w-28`}
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        Save {name}
      </Button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function WindowForm({
  templateId,
  label,
  capacity,
}: {
  templateId: string;
  label: string;
  capacity: number;
}) {
  const [state, action, pending] = useActionState(
    windowAction.bind(null, templateId),
    initial
  );
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="w-40 tabular-nums">{label}</span>
      <label className="sr-only" htmlFor={`cap-${templateId}`}>
        Orders per Slot, {label}
      </label>
      <input
        id={`cap-${templateId}`}
        name="capacity"
        type="number"
        min={0}
        defaultValue={capacity}
        className={`${FIELD} w-20`}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Save
      </Button>
      <Button
        type="submit"
        name="remove"
        value="1"
        size="sm"
        variant="ghost"
        disabled={pending}
      >
        Remove
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

export function AddWindowForm() {
  const [state, action, pending] = useActionState(addWindowAction, initial);
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="grid gap-1 text-sm font-semibold">
        Day
        <select name="weekday" defaultValue="1" className={FIELD}>
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        From
        <input name="start" type="time" step={1800} className={FIELD} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        To
        <input name="end" type="time" step={1800} className={FIELD} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Orders per Slot
        <input
          name="capacity"
          type="number"
          min={0}
          defaultValue={20}
          className={`${FIELD} w-20`}
        />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        Add window
      </Button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function SlotCapacityForm({
  slotId,
  label,
  capacity,
  booked,
}: {
  slotId: string;
  label: string;
  capacity: number;
  booked: number;
}) {
  const [state, action, pending] = useActionState(
    slotCapacityAction.bind(null, slotId),
    initial
  );
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="w-56 tabular-nums">{label}</span>
      <span className="text-muted-foreground w-24 text-sm tabular-nums">
        {booked} booked
      </span>
      <label className="sr-only" htmlFor={`slot-${slotId}`}>
        Orders allowed, {label}
      </label>
      <input
        id={`slot-${slotId}`}
        name="capacity"
        type="number"
        min={booked}
        defaultValue={capacity}
        className={`${FIELD} w-20`}
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Save
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

/** The notice across the shop, and GCash and card on or off. */
export function HubStatusForm({
  notice,
  until,
  onlinePaused,
}: {
  notice: string;
  /** datetime-local value in Manila, or "". */
  until: string;
  onlinePaused: boolean;
}) {
  const [state, action, pending] = useActionState(hubStatusAction, initial);
  return (
    <form key={formKey(state)} action={action} className="grid max-w-xl gap-3">
      <label className="grid gap-1 text-sm font-semibold">
        Notice across the shop (blank for none)
        <input
          name="notice"
          maxLength={200}
          defaultValue={notice}
          placeholder="Closed Thursday for the typhoon. Orders resume Friday."
          className={INLINE_FIELD}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Show it until (blank: until you remove it)
        <input
          name="until"
          type="datetime-local"
          defaultValue={until}
          className={`${INLINE_FIELD} w-64`}
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          name="onlinePaused"
          defaultChecked={onlinePaused}
          className="accent-ink size-5"
        />
        Pause GCash and card: cash on delivery only
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="justify-self-start"
      >
        Save
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

/** Close the Hub for whole days: no new Orders, booked ones stay. */
export function CloseSlotsForm() {
  const [state, action, pending] = useActionState(closeSlotsAction, initial);
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="grid gap-1 text-sm font-semibold">
        From
        <input name="from" type="date" className={`${INLINE_FIELD} w-44`} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        To
        <input name="to" type="date" className={`${INLINE_FIELD} w-44`} />
      </label>
      <Button type="submit" variant="secondary" disabled={pending}>
        Close these days
      </Button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
