"use client";

import { BellRingingIcon } from "@phosphor-icons/react";
import { useTransition } from "react";

import { stockAlertAction } from "@/app/[lang]/p/actions";
import { Button } from "@/components/ui/button";
import { useLang, useMessages } from "@/i18n/client";

/** "Tell me when it's back" on a sold-out Product, or undo it (ADR 0014). */
export function StockAlertButton({
  productId,
  on,
}: {
  productId: string;
  on: boolean;
}) {
  const t = useMessages().productPage;
  const lang = useLang();
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(() => stockAlertAction(productId, !on, lang));
  return on ? (
    <p role="status" className="grid gap-1 text-sm">
      <b>{t.alertOn}</b>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className="decoration-border-strong justify-self-start underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
      >
        {t.alertOff}
      </button>
    </p>
  ) : (
    <Button
      type="button"
      variant="secondary"
      onClick={toggle}
      disabled={pending}
    >
      <BellRingingIcon aria-hidden />
      {t.alertAsk}
    </Button>
  );
}
