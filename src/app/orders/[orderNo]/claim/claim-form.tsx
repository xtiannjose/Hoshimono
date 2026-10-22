"use client";

import { useActionState, useState } from "react";

import { CLAIM_REASON } from "@/components/order/claim-labels";
import { Button } from "@/components/ui/button";
import type { ClaimReason } from "@/generated/prisma/enums";
import { formatMoney } from "@/lib/money";

import { fileClaimAction, type ClaimFormState } from "./actions";

type Line = {
  id: string;
  name: string;
  weighed: boolean;
  units: number;
  amountCents: number;
};

const initial: ClaimFormState = { errors: {} };
const FIELD =
  "rounded-field border-input bg-card min-h-11 w-full border px-3 text-base";
const PHOTO_NEEDED: ClaimReason[] = ["not_fresh", "damaged"];

function Problem({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-err text-sm font-semibold">
      {message}
    </p>
  ) : null;
}

/** Report a problem with one delivered item (ADR 0016). */
export function ClaimForm({
  orderNo,
  lines,
}: {
  orderNo: string;
  lines: Line[];
}) {
  const [state, action, pending] = useActionState(
    fileClaimAction.bind(null, orderNo),
    initial
  );
  const [lineId, setLineId] = useState(lines.length === 1 ? lines[0].id : "");
  const [reason, setReason] = useState<ClaimReason | "">("");
  const line = lines.find((l) => l.id === lineId);
  const e = state.errors;
  return (
    <form action={action} className="grid max-w-xl gap-6">
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">Which item?</legend>
        {lines.map((l) => (
          <label
            key={l.id}
            className="rounded-field border-input has-[:checked]:border-ink flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2"
          >
            <input
              type="radio"
              name="orderLineId"
              value={l.id}
              checked={lineId === l.id}
              onChange={() => setLineId(l.id)}
              className="accent-ink size-5"
            />
            <span className="flex-1">{l.name}</span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {formatMoney(l.amountCents)}
            </span>
          </label>
        ))}
        <Problem message={e.form} />
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">What was wrong?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(CLAIM_REASON) as ClaimReason[]).map((r) => (
            <label
              key={r}
              className="rounded-field border-input has-[:checked]:border-ink flex min-h-11 cursor-pointer items-center gap-3 border px-3"
            >
              <input
                type="radio"
                name="reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-ink size-5"
              />
              {CLAIM_REASON[r]}
            </label>
          ))}
        </div>
        <Problem message={e.reason} />
      </fieldset>

      {line && !line.weighed && line.units > 1 && (
        <div className="grid gap-1.5">
          <label htmlFor="units" className="font-semibold">
            How many of the {line.units}?
          </label>
          <input
            id="units"
            name="units"
            type="number"
            min={1}
            max={line.units}
            defaultValue={1}
            className={`${FIELD} w-28`}
          />
          <Problem message={e.units} />
        </div>
      )}

      <div className="grid gap-1.5">
        <label htmlFor="photos" className="font-semibold">
          Photos
          {reason && PHOTO_NEEDED.includes(reason) ? "" : " (optional)"}
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-describedby="photos-help"
          className="text-sm"
        />
        <p id="photos-help" className="text-muted-foreground text-[13px]">
          Up to 3 photos of the item and its label. Needed when it was spoiled
          or damaged.
        </p>
        <Problem message={e.photos} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="note" className="font-semibold">
          Anything to add? (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={500}
          className={`${FIELD} py-2`}
        />
        <Problem message={e.note} />
      </div>

      <div>
        <Button
          type="submit"
          size="lg"
          disabled={pending || !lineId || !reason}
        >
          {pending ? "Sending..." : "Send report"}
        </Button>
      </div>
    </form>
  );
}
