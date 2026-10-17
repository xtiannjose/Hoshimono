"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestSignInLink, type SignInState } from "./actions";

const initial: SignInState = { status: "idle" };

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestSignInLink, initial);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-card bg-accent-soft grid gap-2 p-6">
        <h2 className="type-h3">Check your email</h2>
        <p>
          We sent a sign-in link to <b>{state.email}</b>. It works for 5
          minutes.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : null;
  return (
    <form action={action} noValidate className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          // React resets the form after an action; keep what was typed.
          defaultValue={state.status === "error" ? state.email : ""}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
        />
        {error && (
          <p id="email-error" className="type-small text-err">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending link..." : "Email me a link"}
      </Button>
    </form>
  );
}
