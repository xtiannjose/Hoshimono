"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { FormMessage } from "../form-message";
import { settleRefundAction, type RefundFormState } from "./actions";

const initial: RefundFormState = { errors: {} };
const FIELD =
  "rounded-field border-input bg-card h-11 border px-3 text-base font-normal";

export function SettleRefundForms({ refundId }: { refundId: string }) {
  const [sent, markSent, sending] = useActionState(
    settleRefundAction.bind(null, refundId, "sent"),
    initial
  );
  const [retried, retry, retrying] = useActionState(
    settleRefundAction.bind(null, refundId, "retry"),
    initial
  );
  return (
    <div className="grid gap-2">
      <form action={markSent} className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">
          PayMongo refund id (optional)
          <input name="providerRef" placeholder="ref_..." className={FIELD} />
        </label>
        <Button type="submit" size="sm" disabled={sending || retrying}>
          It went through
        </Button>
      </form>
      <form action={retry}>
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={sending || retrying}
        >
          It did not: send again
        </Button>
      </form>
      <FormMessage state={sent.saved || sent.errors.form ? sent : retried} />
    </div>
  );
}
