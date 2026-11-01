"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/generated/prisma/enums";

import {
  addNoteAction,
  changeAddressAction,
  giveVoucherAction,
  moveSlotAction,
  moveOrderAction,
  recordPaymentAction,
  textCustomerAction,
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

/** One line under a form: its error, or that it worked. */
function Result({ state, done }: { state: OrderFormState; done: string }) {
  const error = Object.values(state.errors)[0];
  if (error) {
    return (
      <p role="alert" className="text-err text-sm font-semibold">
        {error}
      </p>
    );
  }
  return state.saved ? (
    <p role="status" className="text-sm font-semibold">
      {done}
    </p>
  ) : null;
}

/** PayMongo shows it paid, but no webhook applied it (runbook 1a). */
export function RecordPaymentForm({
  orderId,
  orderNo,
  amount,
}: {
  orderId: string;
  orderNo: string;
  amount: string;
}) {
  const [state, action, pending] = useActionState(
    recordPaymentAction.bind(null, orderId, orderNo),
    initial
  );
  return (
    <form key={formKey(state)} action={action} className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        PayMongo payment id
        <input name="paymentRef" placeholder="pay_..." className={FIELD} />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="amountMatches"
          value="yes"
          className="accent-ink size-5"
        />
        PayMongo shows {amount} paid
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="justify-self-start"
      >
        Record the payment
      </Button>
      <Result state={state} done="Recorded." />
    </form>
  );
}

/** A text to the Customer's number on the Order. */
export function TextCustomerForm({
  orderId,
  orderNo,
}: {
  orderId: string;
  orderNo: string;
}) {
  const [state, action, pending] = useActionState(
    textCustomerAction.bind(null, orderId, orderNo),
    initial
  );
  return (
    <form key={formKey(state)} action={action} className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        Text the Customer
        <textarea name="text" rows={2} maxLength={300} className={TEXTAREA} />
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="justify-self-start"
      >
        Send the text
      </Button>
      <Result state={state} done="Sent, and added to the notes." />
    </form>
  );
}

/** A Voucher to make up for the Order. */
export function VoucherForm({
  orderId,
  orderNo,
}: {
  orderId: string;
  orderNo: string;
}) {
  const [state, action, pending] = useActionState(
    giveVoucherAction.bind(null, orderId, orderNo),
    initial
  );
  return (
    <form key={formKey(state)} action={action} className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        Voucher amount (₱)
        <input name="amount" inputMode="decimal" className={FIELD} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Why
        <input name="reason" className={FIELD} />
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="justify-self-start"
      >
        Give the Voucher
      </Button>
      <Result state={state} done="Given, and the Customer is told." />
    </form>
  );
}

type Choice = { id: string; label: string };

/** One select and a button: a new Slot, or another saved address. */
function ChoiceForm({
  action,
  name,
  label,
  choices,
  submit,
  done,
}: {
  action: (prev: OrderFormState, fd: FormData) => Promise<OrderFormState>;
  name: string;
  label: string;
  choices: Choice[];
  submit: string;
  done: string;
}) {
  const [state, run, pending] = useActionState(action, initial);
  if (choices.length === 0) return null;
  return (
    <form key={formKey(state)} action={run} className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        {label}
        <select name={name} className={FIELD}>
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="justify-self-start"
      >
        {submit}
      </Button>
      <Result state={state} done={done} />
    </form>
  );
}

/** Another Slot with room; the Customer gets a text with the new time. */
export function MoveSlotForm({
  orderId,
  orderNo,
  slots,
}: {
  orderId: string;
  orderNo: string;
  slots: Choice[];
}) {
  return (
    <ChoiceForm
      action={moveSlotAction.bind(null, orderId, orderNo)}
      name="slotId"
      label="Deliver in another Slot"
      choices={slots}
      submit="Move it"
      done="Moved, and the Customer is told."
    />
  );
}

/** Another of the Customer's saved addresses; the Delivery Fee stays. */
export function ChangeAddressForm({
  orderId,
  orderNo,
  addresses,
}: {
  orderId: string;
  orderNo: string;
  addresses: Choice[];
}) {
  return (
    <ChoiceForm
      action={changeAddressAction.bind(null, orderId, orderNo)}
      name="addressId"
      label="Deliver to another of their addresses"
      choices={addresses}
      submit="Change the address"
      done="Changed. The Delivery Fee stays as placed."
    />
  );
}
