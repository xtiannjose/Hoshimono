"use client";

import { TicketIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import {
  applyVoucherAction,
  removeVoucherAction,
  type CartResult,
} from "@/app/[lang]/cart/actions";
import { announce } from "@/components/live-region";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import type { CartView } from "@/modules/cart";

import { setCartView } from "./cart-store";

/**
 * "Have a Voucher code?" (ADR 0015): one code per Order, kept on the Cart
 * and re-checked each time it is priced. No <form>: Checkout wraps it in its
 * own, so Enter applies the code here instead of placing the Order.
 */
export function VoucherForm({ view }: { view: CartView }) {
  const t = useMessages().cart;
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<CartResult>) =>
    startTransition(async () => {
      try {
        const result = await action();
        setCartView(result.cart);
        const notice = result.notice ? t.notices[result.notice] : "";
        setMessage(notice);
        if (notice) announce(notice);
        else setCode("");
      } catch {
        setMessage(t.failed.generic);
      }
    });
  const voucher = view.voucher;
  const applied = view.priced.voucher;

  if (voucher) {
    const status = voucher.problem
      ? t.notices[voucher.problem]
      : applied && !applied.applied
        ? t.voucher.short(formatMoney(applied.shortByCents))
        : applied?.freeDelivery
          ? t.voucher.freeDelivery
          : t.voucher.off(formatMoney(applied?.discountCents ?? 0));
    return (
      <div className="rounded-field bg-muted flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
        <span>
          <TicketIcon size={16} aria-hidden className="mr-1 inline" />
          {t.voucher.label} <b className="font-mono">{voucher.code}</b>:{" "}
          <span role="status">{status}</span>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(removeVoucherAction)}
          className="decoration-border-strong font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
        >
          {t.voucher.remove}
        </button>
      </div>
    );
  }

  const apply = () => code.trim() && run(() => applyVoucherAction(code));
  return (
    <div className="grid gap-1.5">
      <label htmlFor="voucher-code" className="text-sm font-semibold">
        {t.voucher.prompt}
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
          {t.voucher.apply}
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
