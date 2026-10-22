"use client";

import { useOptimistic, useTransition } from "react";

import { setRemindersAction } from "./actions";

/** "Send me reminders and offers": off until turned on (ADR 0014). */
export function RemindersToggle({ on }: { on: boolean }) {
  const [shown, setShown] = useOptimistic(on);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-1">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
        <input
          type="checkbox"
          checked={shown}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            startTransition(async () => {
              setShown(next);
              await setRemindersAction(next);
            });
          }}
          className="accent-ink size-5"
        />
        Send me reminders and offers by email
      </label>
      <p className="text-muted-foreground pl-8 text-sm">
        Such as a note when you leave items in your cart. Order and delivery
        messages come either way. Turn this off any time.
      </p>
    </div>
  );
}
