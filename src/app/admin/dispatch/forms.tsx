"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";

import { FormMessage } from "../form-message";
import {
  countCashAction,
  deliveredAction,
  deliverWithoutPinAction,
  failedAction,
  sendOutAction,
  type DispatchFormState,
} from "./actions";
import { INLINE_FIELD } from "@/components/ui/field-classes";

const initial: DispatchFormState = { errors: {} };
// 56 px for a Rider on a phone (docs/05 section 9).
const BIG = "min-h-14 px-5 text-base";
const FIELD =
  "rounded-field border-input bg-card h-14 border px-3 text-lg tabular-nums";

/** Choose a Rider and send the Order out. */
export function SendOutForm({
  orderId,
  riders,
  again,
}: {
  orderId: string;
  riders: { id: string; name: string }[];
  again: boolean;
}) {
  const [state, action, pending] = useActionState(
    sendOutAction.bind(null, orderId),
    initial
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        Rider
        <select name="riderId" className={INLINE_FIELD} defaultValue="">
          <option value="" disabled>
            Choose a Rider
          </option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : again ? "Send out again" : "Send out"}
      </Button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** For when the Customer's PIN cannot be used: needs a reason. */
export function WithoutPinForm({
  orderId,
  dueCents,
}: {
  orderId: string;
  /** Cash due for a cash-on-delivery Order; null when paid online. */
  dueCents: number | null;
}) {
  const [state, action, pending] = useActionState(
    deliverWithoutPinAction.bind(null, orderId),
    initial
  );
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Delivered without the PIN
      </summary>
      <form key={formKey(state)} action={action} className="grid gap-2 pt-1">
        <label className="grid gap-1 font-semibold">
          Why was the PIN not used?
          <input name="reason" className={INLINE_FIELD} />
        </label>
        {dueCents !== null && (
          <>
            <label className="grid gap-1 font-semibold">
              Cash received (₱)
              <input
                name="cash"
                inputMode="decimal"
                defaultValue={(dueCents / 100).toFixed(2)}
                className={INLINE_FIELD}
              />
            </label>
            <label className="grid gap-1 font-semibold">
              If the cash is different, why?
              <input name="note" className={INLINE_FIELD} />
            </label>
          </>
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          Mark delivered
        </Button>
        <FormMessage state={state} />
      </form>
    </details>
  );
}

/** The Rider at the door. */
export function DeliveredForm({
  orderId,
  dueCents,
}: {
  orderId: string;
  dueCents: number;
}) {
  const [state, action, pending] = useActionState(
    deliveredAction.bind(null, orderId),
    initial
  );
  const cod = dueCents > 0;
  return (
    <form key={formKey(state)} action={action} className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">
          Customer&apos;s PIN
          <input
            name="pin"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            required
            className={`${FIELD} w-28`}
          />
        </label>
        {cod && (
          <label className="grid gap-1 text-sm font-semibold">
            Cash received (₱)
            <input
              name="cash"
              inputMode="decimal"
              defaultValue={(dueCents / 100).toFixed(2)}
              className={`${FIELD} w-36`}
            />
          </label>
        )}
      </div>
      {cod && (
        <label className="grid gap-1 text-sm font-semibold">
          If the cash is different, why?
          <input name="note" className={INLINE_FIELD} />
        </label>
      )}
      <Button type="submit" disabled={pending} className={BIG}>
        {pending ? "Saving..." : "Delivered"}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

const MISSED = [
  "No one home",
  "Could not reach by phone",
  "Wrong or unclear address",
  "Customer refused",
] as const;

/** The Rider could not deliver: why. */
export function FailedForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(
    failedAction.bind(null, orderId),
    initial
  );
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Could not deliver
      </summary>
      <form key={formKey(state)} action={action} className="grid gap-2 pt-1">
        <label className="grid gap-1 font-semibold">
          What happened?
          <select
            name="reason"
            className={INLINE_FIELD}
            defaultValue={MISSED[0]}
          >
            {MISSED.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-semibold">
          More detail (optional)
          <input name="detail" className={INLINE_FIELD} />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className={BIG}
        >
          Bring it back
        </Button>
        <FormMessage state={state} />
      </form>
    </details>
  );
}

/**
 * The Dispatcher counts a Rider's cash for the day. Blind: the field starts
 * empty, so the number saved is what was counted, not what was expected.
 */
export function CountCashForm({
  riderId,
  day,
}: {
  riderId: string;
  day: string;
}) {
  const [state, action, pending] = useActionState(
    countCashAction.bind(null, riderId, day),
    initial
  );
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-end gap-2"
    >
      <label className="grid gap-1 text-sm font-semibold">
        Cash counted (₱)
        <input
          name="counted"
          inputMode="decimal"
          required
          className={`${INLINE_FIELD} w-36 tabular-nums`}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Note (needed if cash is missing)
        <input name="note" className={`${INLINE_FIELD} w-64`} />
      </label>
      <Button type="submit" disabled={pending}>
        Record count
      </Button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
