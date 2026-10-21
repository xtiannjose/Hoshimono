"use client";

import { ShoppingCartIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import type { FillResult } from "@/app/cart/fill";
import { Button } from "@/components/ui/button";
import { announce } from "@/components/live-region";

import { setCartOpen, setCartView } from "./cart-store";

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
              setCartView(result.cart);
              setMessage(result.message);
              announce(result.message);
            } catch {
              setMessage("We could not add these. Please try again.");
            }
          })
        }
      >
        <ShoppingCartIcon aria-hidden />
        {pending ? "Adding..." : label}
      </Button>
      {message && (
        <p role="status" className="text-sm font-semibold">
          {message}{" "}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="decoration-border-strong underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
          >
            View cart
          </button>
        </p>
      )}
    </div>
  );
}
