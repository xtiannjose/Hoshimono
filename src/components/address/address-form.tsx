"use client";

import { useActionState, useState, type ReactNode } from "react";

import {
  saveAddressAction,
  type AddressFormState,
} from "@/app/[lang]/account/addresses/actions";
import { formKey } from "@/components/form-key";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";

export type AddressFormValues = {
  id?: string;
  label: string;
  line1: string;
  barangay: string;
  city: string;
  landmark: string;
  notes: string;
  isDefault: boolean;
};

export type ServiceArea = { city: string; barangays: string[] | null };

const FIELD =
  "h-11 w-full rounded-field border border-input bg-card px-3 text-base aria-invalid:border-err";
const initial: AddressFormState = { errors: {} };

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-[13px]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-err text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Add or edit a delivery address (PRD ACC-2, CHK-1). Cities come from the
 * Zones we serve; the server checks the Zone again before saving.
 * shortcut: no map pin until a maps provider is chosen.
 */
export function AddressForm({
  values,
  areas,
  next,
  submitLabel = "Save address",
}: {
  values: AddressFormValues;
  areas: ServiceArea[];
  next: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(saveAddressAction, initial);
  // React resets the form after an action; refill it with what was sent.
  const v = { ...values, ...state.values } as AddressFormValues;
  const [picked, setPicked] = useState<string | null>(null);
  const city = picked ?? v.city;
  const barangays = areas.find((a) => a.city === city)?.barangays ?? null;
  const e = state.errors;
  const described = (name: keyof typeof e) =>
    e[name]
      ? { "aria-invalid": true, "aria-describedby": `a-${name}-error` }
      : {};

  return (
    <form
      key={formKey(state)}
      action={action}
      noValidate
      className="grid max-w-xl gap-4"
    >
      <input type="hidden" name="next" value={next} />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {e.area && (
        <p
          role="alert"
          className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold"
        >
          {e.area}
        </p>
      )}
      <Field
        id="a-label"
        label="Name this address"
        error={e.label}
        hint="Such as Home, Office or Lola's house."
      >
        <input
          id="a-label"
          name="label"
          defaultValue={v.label}
          maxLength={40}
          list="a-labels"
          className={FIELD}
          {...described("label")}
        />
        <datalist id="a-labels">
          <option value="Home" />
          <option value="Office" />
          <option value="Condo" />
        </datalist>
      </Field>
      <Field
        id="a-line1"
        label="House or unit number and street"
        error={e.line1}
      >
        <input
          id="a-line1"
          name="line1"
          defaultValue={v.line1}
          maxLength={120}
          autoComplete="address-line1"
          className={FIELD}
          {...described("line1")}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="a-city" label="City" error={e.city}>
          <select
            id="a-city"
            name="city"
            defaultValue={v.city}
            onChange={(event) => setPicked(event.target.value)}
            className={FIELD}
            {...described("city")}
          >
            <option value="">Choose a city</option>
            {areas.map((area) => (
              <option key={area.city} value={area.city}>
                {area.city}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="a-barangay"
          label="Barangay"
          error={e.barangay}
          hint={
            barangays
              ? `In ${city} we deliver to ${barangays.join(", ")}.`
              : undefined
          }
        >
          <input
            id="a-barangay"
            name="barangay"
            defaultValue={v.barangay}
            maxLength={60}
            list={barangays ? "a-barangays" : undefined}
            className={FIELD}
            {...(e.barangay
              ? described("barangay")
              : barangays
                ? { "aria-describedby": "a-barangay-hint" }
                : {})}
          />
          {barangays && (
            <datalist id="a-barangays">
              {barangays.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          )}
        </Field>
      </div>
      <Field
        id="a-landmark"
        label="Landmark"
        error={e.landmark}
        hint="Such as a store, a gate colour or a church nearby."
      >
        <input
          id="a-landmark"
          name="landmark"
          defaultValue={v.landmark}
          maxLength={120}
          className={FIELD}
          {...(e.landmark
            ? described("landmark")
            : { "aria-describedby": "a-landmark-hint" })}
        />
      </Field>
      <Field
        id="a-notes"
        label="Notes for the Rider (optional)"
        error={e.notes}
      >
        <textarea
          id="a-notes"
          name="notes"
          defaultValue={v.notes}
          maxLength={200}
          rows={3}
          className="rounded-field border-input bg-card w-full border px-3 py-2 text-base"
          {...described("notes")}
        />
      </Field>
      <label className="flex items-center gap-3 text-[15px]">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={v.isDefault}
          className="accent-ink size-5"
        />
        Use this address by default
      </label>
      <p className="text-muted-foreground text-[13px]">
        We deliver to {areas.map((a) => a.city).join(", ")} for now.
      </p>
      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
