"use client";

import { useActionState } from "react";

import { CLAIM_REASON } from "@/components/order/claim-labels";
import { Button } from "@/components/ui/button";

import {
  FIELD,
  FieldError,
  INLINE_FIELD,
  Labeled,
  TEXTAREA,
} from "../content/editor-parts";
import {
  decideClaimAction,
  fileClaimForCustomerAction,
  reopenClaimAction,
  type DecisionState,
} from "./actions";

const initial: DecisionState = { errors: {} };

/** Approve a claim in full or for less, with an optional note to the Customer. */
export function ApproveForm({
  claimId,
  claimed,
  payback,
}: {
  claimId: string;
  /** Pesos, such as "115.00". */
  claimed: string;
  /** How it comes back, in words. */
  payback: string;
}) {
  const [state, action, pending] = useActionState(
    decideClaimAction.bind(null, claimId, true),
    initial
  );
  return (
    <form
      action={action}
      aria-label="Approve"
      className="rounded-card border-border bg-card grid gap-3 border p-4"
    >
      <h2 className="type-h3">Approve</h2>
      <p className="text-muted-foreground text-sm">{payback}</p>
      <Labeled label="Amount (₱)" htmlFor="amount" error={state.errors.amount}>
        <input
          id="amount"
          name="amount"
          inputMode="decimal"
          defaultValue={claimed}
          className={`${INLINE_FIELD} w-40`}
        />
      </Labeled>
      <Labeled
        label="Note to the Customer (optional)"
        htmlFor="approve-note"
        hint="Say why if you approve less than they claimed."
      >
        <input id="approve-note" name="note" className={FIELD} />
      </Labeled>
      <FieldError message={state.errors.form} />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Approving..." : "Approve and pay back"}
        </Button>
      </div>
    </form>
  );
}

export function RejectForm({ claimId }: { claimId: string }) {
  const [state, action, pending] = useActionState(
    decideClaimAction.bind(null, claimId, false),
    initial
  );
  return (
    <form
      action={action}
      aria-label="Reject"
      className="rounded-card border-border bg-card grid gap-3 border p-4"
    >
      <h2 className="type-h3">Reject</h2>
      <Labeled
        label="Why, for the Customer"
        htmlFor="reject-note"
        error={state.errors.note}
      >
        <textarea id="reject-note" name="note" rows={3} className={TEXTAREA} />
      </Labeled>
      <FieldError message={state.errors.form} />
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Rejecting..." : "Reject"}
        </Button>
      </div>
    </form>
  );
}

/** A rejected claim back to open, when the Customer shows more (ADR 0022). */
export function ReopenForm({ claimId }: { claimId: string }) {
  const [state, action, pending] = useActionState(
    reopenClaimAction.bind(null, claimId),
    initial
  );
  return (
    <form action={action} className="grid gap-2">
      <FieldError message={state.errors.form} />
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Reopening..." : "Reopen for another look"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Staff file a claim for a Customer who called or wrote in (ADR 0022):
 * any time after delivery, no photo needed. It opens to be decided.
 */
export function FileClaimForm({
  orderNo,
  lines,
}: {
  orderNo: string;
  /** Items that can still be claimed. */
  lines: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(
    fileClaimForCustomerAction.bind(null, orderNo),
    initial
  );
  return (
    <form action={action} className="grid gap-3">
      <Labeled label="Item" htmlFor="claim-line" error={state.errors.form}>
        <select id="claim-line" name="orderLineId" className={FIELD}>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled
        label="What was wrong"
        htmlFor="claim-reason"
        error={state.errors.reason}
      >
        <select id="claim-reason" name="reason" className={FIELD}>
          {Object.entries(CLAIM_REASON).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Labeled>
      <Labeled
        label="How many"
        htmlFor="claim-units"
        hint="A weighed item is claimed whole."
        error={state.errors.units}
      >
        <input
          id="claim-units"
          name="units"
          type="number"
          min={1}
          defaultValue={1}
          className={`${INLINE_FIELD} w-24`}
        />
      </Labeled>
      <Labeled
        label="What the Customer said"
        htmlFor="claim-note"
        error={state.errors.note}
      >
        <textarea
          id="claim-note"
          name="note"
          rows={2}
          maxLength={500}
          className={TEXTAREA}
        />
      </Labeled>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Filing..." : "File the claim"}
        </Button>
      </div>
    </form>
  );
}
