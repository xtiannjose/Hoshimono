"use client";

import { useActionState, useState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { PickLine } from "@/modules/orders";

import {
  finishPickingAction,
  recordPickAction,
  startPickingAction,
  substituteAction,
  type PickFormState,
} from "../actions";

const initial: PickFormState = { errors: {} };
// 56 px tap targets for a one-handed Picker (docs/05 section 9).
const BIG = "min-h-14 px-5 text-base";
const FIELD =
  "rounded-field border-input bg-card h-14 w-28 border px-3 text-lg tabular-nums";

function Problem({ state }: { state: PickFormState }) {
  const message = Object.values(state.errors)[0];
  return message ? (
    <p role="alert" className="text-err text-sm font-semibold">
      {message}
    </p>
  ) : null;
}

export function StartPicking({
  orderId,
  orderNo,
}: {
  orderId: string;
  orderNo: string;
}) {
  const [state, action, pending] = useActionState(
    startPickingAction.bind(null, orderId, orderNo),
    initial
  );
  return (
    <form action={action} className="grid gap-2">
      <Button type="submit" disabled={pending} className={BIG}>
        {pending ? "Starting..." : "Start picking"}
      </Button>
      <Problem state={state} />
    </form>
  );
}

export function FinishPicking({
  orderId,
  orderNo,
}: {
  orderId: string;
  orderNo: string;
}) {
  const [state, action, pending] = useActionState(
    finishPickingAction.bind(null, orderId, orderNo),
    initial
  );
  return (
    <form action={action} className="grid gap-2">
      <Button type="submit" disabled={pending} className={`${BIG} w-full`}>
        {pending ? "Finishing..." : "Finish picking"}
      </Button>
      <Problem state={state} />
    </form>
  );
}

/** The Picker's controls for one line (ADR 0010). */
export function PickLineControls({
  line,
  orderNo,
  suggestions,
}: {
  line: PickLine;
  orderNo: string;
  /** Similar Products for a "pick a similar item" line. */
  suggestions: { id: string; name: string; priceCents: number }[];
}) {
  const [picked, pick, picking] = useActionState(
    recordPickAction.bind(null, line.id, orderNo),
    initial
  );
  const [subbed, substitute, substituting] = useActionState(
    substituteAction.bind(null, line.id, orderNo),
    initial
  );
  const [short, setShort] = useState(false);
  const busy = picking || substituting;
  // A line saved as short offers its substitute at once.
  const offer = short || line.status === "short";

  if (line.weighed) {
    return (
      <div className="grid gap-2">
        <form
          key={formKey(picked)}
          action={pick}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-sm font-semibold">
            Packed weight (g)
            <input
              name="grams"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              defaultValue={line.finalWeightGrams ?? ""}
              placeholder={String(line.orderedWeightGrams)}
              className={FIELD}
            />
          </label>
          <Button type="submit" disabled={busy} className={BIG}>
            Save weight
          </Button>
        </form>
        <form action={pick}>
          <input type="hidden" name="grams" value="0" />
          <Button
            type="submit"
            variant="secondary"
            disabled={busy}
            className={BIG}
          >
            None left: short
          </Button>
        </form>
        <Problem state={picked} />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={pick}>
          <input type="hidden" name="found" value={line.orderedQty} />
          <Button type="submit" disabled={busy} className={BIG}>
            Found all {line.orderedQty}
          </Button>
        </form>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => setShort((s) => !s)}
          aria-expanded={short}
          className={BIG}
        >
          Short
        </Button>
      </div>
      {short && (
        <form
          key={formKey(picked)}
          action={pick}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-sm font-semibold">
            How many found?
            <input
              name="found"
              type="number"
              inputMode="numeric"
              min={0}
              max={line.orderedQty - 1}
              required
              defaultValue={0}
              className={FIELD}
            />
          </label>
          <Button type="submit" disabled={busy} className={BIG}>
            Save
          </Button>
        </form>
      )}
      {offer && line.preference === "preferred" && line.preferred && (
        <form action={substitute}>
          <input type="hidden" name="productId" value={line.preferred.id} />
          <Button
            type="submit"
            variant="secondary"
            disabled={busy}
            className={BIG}
          >
            Use their choice: {line.preferred.name}
          </Button>
        </form>
      )}
      {offer && line.preference === "allow" && suggestions.length > 0 && (
        <form action={substitute} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm font-semibold">
            Offer instead (they have 10 minutes to say no)
            <select
              name="productId"
              className="rounded-field border-input bg-card h-14 border px-3 text-base"
            >
              {suggestions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}, {formatMoney(p.priceCents)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            variant="secondary"
            disabled={busy}
            className={BIG}
          >
            Offer substitute
          </Button>
        </form>
      )}
      {offer && line.preference === "none" && (
        <p className="text-muted-foreground text-sm">
          No substitute: save how many you found.
        </p>
      )}
      <Problem state={picked} />
      <Problem state={subbed} />
    </div>
  );
}
