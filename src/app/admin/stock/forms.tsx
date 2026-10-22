"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";

import { FormMessage } from "../form-message";
import { stockAction, type StockFormState, type StockMove } from "./actions";
import { INLINE_FIELD as FIELD } from "@/components/ui/field-classes";

const initial: StockFormState = { errors: {} };

const FORMS: Record<
  StockMove,
  { title: string; field: string; label: string; note?: string; button: string }
> = {
  receive: {
    title: "Received from a supplier",
    field: "quantity",
    label: "How many came in",
    note: "Delivery receipt number (optional)",
    button: "Add to stock",
  },
  shrink: {
    title: "Spoiled, damaged or lost",
    field: "quantity",
    label: "How many to take off",
    note: "What happened",
    button: "Take off stock",
  },
  count: {
    title: "After a physical count",
    field: "counted",
    label: "How many are on the shelf",
    note: "Note (optional)",
    button: "Set the count",
  },
  threshold: {
    title: "Low-stock alert",
    field: "threshold",
    label: "Show as low at or under",
    button: "Save",
  },
};

/** One stock change: receive, shrink, count or the low-stock threshold. */
export function StockForm({
  productId,
  move,
  defaultValue,
}: {
  productId: string;
  move: StockMove;
  defaultValue?: number;
}) {
  const [state, action, pending] = useActionState(
    stockAction.bind(null, productId, move),
    initial
  );
  const form = FORMS[move];
  return (
    <form
      key={formKey(state)}
      action={action}
      className="rounded-card border-border bg-card grid gap-3 border p-4"
    >
      <h2 className="type-h3">{form.title}</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">
          {form.label}
          <input
            name={form.field}
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={defaultValue}
            className={`${FIELD} w-32 tabular-nums`}
          />
        </label>
        {form.note && (
          <label className="grid gap-1 text-sm font-semibold">
            {form.note}
            <input name="note" maxLength={200} className={`${FIELD} w-64`} />
          </label>
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          {form.button}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
