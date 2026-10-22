"use client";

import { ShoppingCartIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import type { FillResult } from "@/app/[lang]/cart/fill";
import { Button } from "@/components/ui/button";
import { announce } from "@/components/live-region";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";

import { setCartOpen, setCartView } from "./cart-store";

/** What filling the Cart did, in the page's language. */
export function filledText(t: Messages["cart"], result: FillResult): string {
  if (result.notice) return t.notices[result.notice];
  const name = (n: string | null) => n ?? t.unknownItem;
  return t.filled(
    result.added,
    result.soldOut.map(name),
    result.capped.map(name)
  );
}

/**
 * One button that adds several Products to the Cart on the server, then
 * shows the Cart and what happened: Reorder and Shopping Lists (ADR 0014).
 */
export function FillCartButton({
  fill,
  label,
  variant = "default",
}: {
  /** A Server Action bound to what to add. */
  fill: () => Promise<FillResult>;
  label: string;
  variant?: "default" | "secondary";
}) {
  const t = useMessages();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid justify-items-start gap-2">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              const result = await fill();
              const text = filledText(t.cart, result);
              setCartView(result.cart);
              setMessage(text);
              announce(text);
            } catch {
              setMessage(t.cart.failed.fill);
            }
          })
        }
      >
        <ShoppingCartIcon aria-hidden />
        {pending ? t.cart.adding : label}
      </Button>
      {message && (
        <p role="status" className="text-sm font-semibold">
          {message}{" "}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="decoration-border-strong underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
          >
            {t.shell.viewCart}
          </button>
        </p>
      )}
    </div>
  );
}
