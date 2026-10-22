"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { saveNameAction, type NameState } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<NameState, FormData>(
    saveNameAction,
    {}
  );
  return (
    <form action={action} noValidate className="grid gap-2">
      <Label htmlFor="name">Your name</Label>
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
          Save
        </Button>
      </div>
      {state.message && (
        <p id="name-error" className="type-small text-err">
          {state.message}
        </p>
      )}
      {state.saved && (
        <p role="status" className="type-small">
          Saved.
        </p>
      )}
    </form>
  );
}
