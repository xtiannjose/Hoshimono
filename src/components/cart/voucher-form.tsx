"use client";

import { TicketIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import {
  applyVoucherAction,
  removeVoucherAction,
  type CartResult,
} from "@/app/cart/actions";
import { announce } from "@/components/live-region";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/modules/cart";

import { setCartView } from "./cart-store";

/**
 * "Have a Voucher code?" (ADR 0015): one code per Order, kept on the Cart
 * and re-checked each time it is priced. No <form>: Checkout wraps it in its
 * own, so Enter applies the code here instead of placing the Order.
 */
export function VoucherForm({ view }: { view: CartView }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<CartResult>) =>
    startTransition(async () => {
      try {
        const result = await action();
        setCartView(result.cart);
        setMessage(result.message ?? "");
        if (result.message) announce(result.message);
        else setCode("");
      } catch {
        setMessage("That did not work. Please try again.");
      }
    });
  const voucher = view.voucher;
  const applied = view.priced.voucher;

  if (voucher) {
    const status = voucher.problem
      ? voucher.problem
      : applied && !applied.applied
        ? `Add ${formatMoney(applied.shortByCents)} more to use it.`
        : applied?.freeDelivery
          ? "Free delivery."
          : `${formatMoney(applied?.discountCents ?? 0)} off.`;
    return (
      <div className="rounded-field bg-muted flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <span>
          <TicketIcon size={16} aria-hidden className="mr-1 inline" />
          Voucher <b className="font-mono">{voucher.code}</b>:{" "}
          <span role="status">{status}</span>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(removeVoucherAction)}
          className="decoration-border-strong font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
        >
          Remove
        </button>
      </div>
    );
  }

  const apply = () => code.trim() && run(() => applyVoucherAction(code));
  return (
    <div className="grid gap-1.5">
      <label htmlFor="voucher-code" className="text-sm font-semibold">
        Have a Voucher code?
      </label>
      <div className="flex gap-2">
        <input
          id="voucher-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="rounded-field border-input bg-card min-h-11 min-w-0 flex-1 border px-3 font-mono text-base uppercase"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !code.trim()}
          onClick={apply}
        >
          Apply
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-err text-sm font-semibold">
          {message}
        </p>
      )}
    </div>
  );
}
