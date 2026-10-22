"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  requestSignInCode,
  requestSignInLink,
  signInWithGoogle,
  verifySignInCodeAction,
  type CodeState,
  type SignInState,
} from "./actions";

const initial: SignInState = { status: "idle" };
const initialCode: CodeState = { step: "number", typed: "" };

type Method = "email" | "phone";

export function SignInForm({
  next,
  google,
}: {
  next: string;
  google: boolean;
}) {
  const [method, setMethod] = useState<Method>("email");
  return (
    <div className="grid gap-6">
      {google && (
        <>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="secondary" className="w-full">
              Continue with Google
            </Button>
          </form>
          <p className="text-muted-foreground text-center text-sm">or</p>
        </>
      )}
      <fieldset className="rounded-pill bg-muted grid grid-cols-2 gap-1 p-1">
        <legend className="sr-only">Sign in with</legend>
        {(
          [
            ["email", "Email"],
            ["phone", "Mobile number"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="rounded-pill has-[:checked]:bg-card has-[:focus-visible]:outline-ring text-label relative grid min-h-11 cursor-pointer place-items-center font-semibold has-[:checked]:shadow-sm has-[:focus-visible]:outline-2"
          >
            <input
              type="radio"
              name="method"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </fieldset>
      {method === "email" ? (
        <EmailForm next={next} />
      ) : (
        <PhoneForm next={next} />
      )}
    </div>
  );
}

function EmailForm({ next }: { next: string }) {
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

function PhoneForm({ next }: { next: string }) {
  const [sent, send, sending] = useActionState(requestSignInCode, initialCode);
  const [checked, check, checking] = useActionState(
    verifySignInCodeAction,
    initialCode
  );
  if (sent.step === "code" && sent.phone) {
    const error = checked.message;
    return (
      <form action={check} noValidate className="grid gap-4">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="phone" value={sent.phone} />
        <p role="status">
          We texted a 6-digit code to <b>{sent.typed}</b>. It works for 5
          minutes.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "code-error" : undefined}
          />
          {error && (
            <p id="code-error" className="type-small text-err">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" disabled={checking}>
          {checking ? "Checking..." : "Sign in"}
        </Button>
      </form>
    );
  }

  const error = sent.message;
  return (
    <form action={send} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="phone">Mobile number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0917 123 4567"
          defaultValue={sent.typed}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "phone-error" : undefined}
        />
        {error && (
          <p id="phone-error" className="type-small text-err">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={sending}>
        {sending ? "Sending code..." : "Text me a code"}
      </Button>
    </form>
  );
}
