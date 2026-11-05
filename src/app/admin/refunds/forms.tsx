"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { FormMessage } from "../form-message";
import { settleRefundAction, type RefundFormState } from "./actions";
import { INLINE_FIELD as FIELD } from "@/components/ui/field-classes";

const initial: RefundFormState = { errors: {} };

export function SettleRefundForms({ refundId }: { refundId: string }) {
  const [sent, markSent, sending] = useActionState(
    settleRefundAction.bind(null, refundId, "sent"),
    initial
  );
  const [retried, retry, retrying] = useActionState(
    settleRefundAction.bind(null, refundId, "retry"),
    initial
  );
  const [other, markOther, marking] = useActionState(
    settleRefundAction.bind(null, refundId, "elsewhere"),
    initial
  );
  const busy = sending || retrying || marking;
  return (
    <div className="grid gap-2">
      <form action={markSent} className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">
          PayMongo refund id (optional)
          <input name="providerRef" placeholder="ref_..." className={FIELD} />
        </label>
        <Button type="submit" size="sm" disabled={busy}>
          It went through
        </Button>
      </form>
      <form action={retry}>
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          It did not: send again
        </Button>
      </form>
      <form action={markOther} className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-semibold">
          Or paid back another way: how?
          <input
            name="providerRef"
            placeholder="GCash sent by hand, ref 1234"
            className={FIELD}
          />
        </label>
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          Paid back another way
        </Button>
      </form>
      <p className="text-muted-foreground text-sm">
        Paid back another way, the app sends no refund message: text the
        Customer from the Order page.
      </p>
      <FormMessage
        state={
          sent.saved || sent.errors.form
            ? sent
            : other.saved || other.errors.form
              ? other
              : retried
        }
      />
    </div>
  );
}
