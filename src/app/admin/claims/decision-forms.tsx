"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { FIELD, FieldError, Labeled } from "../content/editor-parts";
import { decideClaimAction, type DecisionState } from "./actions";

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
          className={`${FIELD} w-40`}
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
        <textarea
          id="reject-note"
          name="note"
          rows={3}
          className={`${FIELD} py-2`}
        />
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
