"use client";

import { useActionState, useState, type ReactNode } from "react";

import {
  saveAddressAction,
  type AddressFormState,
} from "@/app/[lang]/account/addresses/actions";
import { formKey } from "@/components/form-key";
import { PRIMARY_BUTTON } from "@/components/ui/button-classes";
import { FIELD } from "@/components/ui/field-classes";
import { TEXTAREA } from "@/components/ui/field-classes";
import { useLang, useMessages } from "@/i18n/client";

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
        <p id={`${id}-hint`} className="text-muted-foreground text-fine">
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
  submitLabel,
  first = false,
}: {
  values: AddressFormValues;
  areas: ServiceArea[];
  /** Where to go once saved, already in the page's language. */
  next: string;
  submitLabel?: string;
  /** The Customer's first address: it becomes the default, so do not ask. */
  first?: boolean;
}) {
  const [state, action, pending] = useActionState(saveAddressAction, initial);
  const lang = useLang();
  const t = useMessages().addresses;
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
      <input type="hidden" name="lang" value={lang} />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {e.area && (
        <p
          role="alert"
          className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm font-semibold"
        >
          {e.area}
        </p>
      )}
      <Field id="a-label" label={t.label} error={e.label} hint={t.labelHint}>
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
          {t.labelIdeas.map((idea) => (
            <option key={idea} value={idea} />
          ))}
        </datalist>
      </Field>
      <Field id="a-line1" label={t.line1} error={e.line1}>
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
        <Field
          id="a-city"
          label={t.city}
          error={e.city}
          hint={t.cityHint(areas.map((a) => a.city).join(", "))}
        >
          <select
            id="a-city"
            name="city"
            defaultValue={v.city}
            onChange={(event) => setPicked(event.target.value)}
            className={FIELD}
            {...(e.city
              ? described("city")
              : { "aria-describedby": "a-city-hint" })}
          >
            <option value="">{t.chooseCity}</option>
            {areas.map((area) => (
              <option key={area.city} value={area.city}>
                {area.city}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="a-barangay"
          label={t.barangay}
          error={e.barangay}
          hint={
            barangays ? t.barangayHint(city, barangays.join(", ")) : undefined
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
        label={t.landmark}
        error={e.landmark}
        hint={t.landmarkHint}
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
      <Field id="a-notes" label={t.notesLabel} error={e.notes}>
        <textarea
          id="a-notes"
          name="notes"
          defaultValue={v.notes}
          maxLength={200}
          rows={3}
          className={TEXTAREA}
          {...described("notes")}
        />
      </Field>
      {!first && (
        <label className="text-label flex items-center gap-3">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={v.isDefault}
            className="accent-ink size-5"
          />
          {t.isDefault}
        </label>
      )}
      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
          {pending ? t.saving : (submitLabel ?? t.save)}
        </button>
      </div>
    </form>
  );
}
