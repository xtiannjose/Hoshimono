"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { FIELD, FieldError, Labeled } from "../content/editor-parts";
import { FormMessage } from "../form-message";
import { saveVoucherAction, type OfferFormState } from "../promotions/actions";

export type VoucherValues = {
  code: string;
  kind: "percent" | "amount" | "free_delivery";
  /** Percent, or pesos such as "100.00". */
  value: string;
  maxDiscount: string;
  minSpend: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  firstOrderOnly: boolean;
  isActive: boolean;
};

const initial: OfferFormState = { errors: {} };

/** A Voucher on one page, no code needed (ADR 0015). */
export function VoucherForm({
  id,
  values,
}: {
  id: string | null;
  values: VoucherValues;
}) {
  const [state, action, pending] = useActionState(
    saveVoucherAction.bind(null, id),
    initial
  );
  const [v, setV] = useState(values);
  const set = (patch: Partial<VoucherValues>) =>
    setV((now) => ({ ...now, ...patch }));
  const input = (key: keyof VoucherValues) => ({
    id: key,
    name: key,
    value: String(v[key]),
    onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
      set({ [key]: ev.target.value }),
    className: FIELD,
  });
  const e = state.errors;

  return (
    <form action={action} className="grid max-w-3xl gap-8">
      <section aria-labelledby="what-h" className="grid gap-4">
        <h2 id="what-h" className="type-h3">
          The code and what it gives
        </h2>
        <Labeled
          label="Code"
          htmlFor="code"
          hint="What Customers type, such as SAVE10. Letters, numbers and dashes."
          error={e.code}
        >
          <input
            {...input("code")}
            className={`${FIELD} font-mono uppercase`}
          />
        </Labeled>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="It gives" htmlFor="kind">
            <select
              id="kind"
              name="kind"
              value={v.kind}
              onChange={(ev) =>
                set({ kind: ev.target.value as VoucherValues["kind"] })
              }
              className={FIELD}
            >
              <option value="percent">A percent off the order</option>
              <option value="amount">Pesos off the order</option>
              <option value="free_delivery">Free delivery</option>
            </select>
          </Labeled>
          {v.kind !== "free_delivery" && (
            <Labeled
              label={v.kind === "percent" ? "Percent off" : "Pesos off (₱)"}
              htmlFor="value"
              error={e.value}
            >
              <input {...input("value")} inputMode="decimal" />
            </Labeled>
          )}
          {v.kind === "percent" && (
            <Labeled
              label="Most it takes off (₱, optional)"
              htmlFor="maxDiscount"
              error={e.maxDiscountCents}
            >
              <input {...input("maxDiscount")} inputMode="decimal" />
            </Labeled>
          )}
          <Labeled
            label="Minimum spend (₱)"
            htmlFor="minSpend"
            hint="On the items, after sale prices; 0 for none."
            error={e.minSpendCents}
          >
            <input {...input("minSpend")} inputMode="decimal" />
          </Labeled>
        </div>
      </section>

      <section aria-labelledby="limits-h" className="grid gap-4">
        <h2 id="limits-h" className="type-h3">
          Limits
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled
            label="Uses in all (optional)"
            htmlFor="usageLimit"
            hint="Blank for no limit."
            error={e.usageLimit}
          >
            <input {...input("usageLimit")} type="number" min={1} />
          </Labeled>
          <Labeled
            label="Uses per Customer"
            htmlFor="perCustomerLimit"
            error={e.perCustomerLimit}
          >
            <input {...input("perCustomerLimit")} type="number" min={1} />
          </Labeled>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="firstOrderOnly"
            checked={v.firstOrderOnly}
            onChange={(ev) => set({ firstOrderOnly: ev.target.checked })}
            className="accent-ink size-5"
          />
          First orders only
        </label>
      </section>

      <section
        aria-labelledby="when-h"
        className="rounded-card border-border bg-card grid gap-4 border p-4"
      >
        <h2 id="when-h" className="type-h3">
          When
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled
            label="Starts (Manila time)"
            htmlFor="startsAt"
            error={e.startsAt}
          >
            <input {...input("startsAt")} type="datetime-local" />
          </Labeled>
          <Labeled label="Ends (Manila time)" htmlFor="endsAt" error={e.endsAt}>
            <input {...input("endsAt")} type="datetime-local" />
          </Labeled>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="isActive"
            checked={v.isActive}
            onChange={(ev) => set({ isActive: ev.target.checked })}
            className="accent-ink size-5"
          />
          On (untick to switch it off; used Vouchers are never deleted)
        </label>
        <FieldError message={e.form} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : id ? "Save changes" : "Create Voucher"}
          </Button>
          {state.saved && <FormMessage state={state} />}
        </div>
      </section>
    </form>
  );
}
