"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/enums";

import {
  addNoteAction,
  moveOrderAction,
  type OrderFormState,
} from "../actions";
import { FIELD, TEXTAREA } from "@/components/ui/field-classes";

const initial: OrderFormState = { errors: {} };

/** Move the Order to one of the next statuses its lifecycle allows. */
export function MoveForm({
  orderId,
  orderNo,
  status,
  moves,
}: {
  orderId: string;
  orderNo: string;
  status: OrderStatus;
  moves: { to: OrderStatus; label: string }[];
}) {
  const [state, action, pending] = useActionState(
    moveOrderAction.bind(null, orderId, orderNo, status),
    initial
  );
  const message = state.errors.to ?? state.errors.reason ?? state.errors.form;
  return (
    <form key={formKey(state)} action={action} className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Move to</legend>
        {moves.map((m, i) => (
          <label key={m.to} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="to"
              value={m.to}
              defaultChecked={i === 0}
              className="accent-ink size-5"
            />
            {m.label}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-sm font-semibold">
        Reason (needed to cancel or for a failed delivery)
        <input name="reason" maxLength={200} className={FIELD} />
      </label>
      {message && (
        <p role="alert" className="text-err text-sm font-semibold">
          {message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

/** A note for the other staff. */
export function NoteForm({
  orderId,
  orderNo,
  maxLength,
}: {
  orderId: string;
  orderNo: string;
  maxLength: number;
}) {
  const [state, action, pending] = useActionState(
    addNoteAction.bind(null, orderId, orderNo),
    initial
  );
  return (
    <form key={formKey(state)} action={action} className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        Add a note for the team
        <textarea
          name="text"
          rows={2}
          maxLength={maxLength}
          aria-invalid={state.errors.text ? true : undefined}
          aria-describedby={state.errors.text ? "note-error" : undefined}
          className={TEXTAREA}
        />
      </label>
      {state.errors.text && (
        <p
          id="note-error"
          role="alert"
          className="text-err text-sm font-semibold"
        >
          {state.errors.text}
        </p>
      )}
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="justify-self-start"
      >
        {pending ? "Adding..." : "Add note"}
      </Button>
    </form>
  );
}
