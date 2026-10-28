"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang, useMessages } from "@/i18n/client";

import { saveNameAction, type NameState } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<NameState, FormData>(
    saveNameAction,
    {}
  );
  const lang = useLang();
  const t = useMessages().account;
  return (
    <form action={action} noValidate className="grid gap-2">
      <input type="hidden" name="lang" value={lang} />
      <Label htmlFor="name">{t.name}</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          name="name"
          autoComplete="name"
          maxLength={80}
          // React resets the form after an action; keep what was typed.
          defaultValue={state.name ?? name}
          aria-invalid={state.message ? true : undefined}
          aria-describedby={state.message ? "name-error" : undefined}
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {t.save}
        </Button>
      </div>
      {state.message && (
        <p id="name-error" className="type-small text-err">
          {state.message}
        </p>
      )}
      {state.saved && (
        <p role="status" className="type-small">
          {t.saved}
        </p>
      )}
    </form>
  );
}
