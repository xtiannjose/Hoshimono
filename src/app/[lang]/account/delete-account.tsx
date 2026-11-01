"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";

import { deleteAccountAction, type DeleteState } from "./actions";

/** Delete my account, behind a disclosure and a tick (ADR 0020). */
export function DeleteAccount({ lang }: { lang: Lang }) {
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    {} as DeleteState
  );
  const t = useMessages().account;
  return (
    <details className="text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        {t.deleteAccount}
      </summary>
      <form action={action} className="grid justify-items-start gap-3 pt-1">
        <input type="hidden" name="lang" value={lang} />
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="confirm"
            value="yes"
            className="accent-ink size-5"
          />
          {t.deleteConfirm}
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>
          {t.deleteNow}
        </Button>
        {state.problem && (
          <p role="alert" className="text-err font-semibold">
            {t.deleteProblems[state.problem]}
          </p>
        )}
      </form>
    </details>
  );
}
