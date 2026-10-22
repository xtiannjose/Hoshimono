"use client";

import { SwapIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

import {
  chooseSubstitution,
  listAlternatives,
} from "@/app/[lang]/cart/actions";
import { useMessages } from "@/i18n/client";
import { formatMoney } from "@/lib/money";
import type { CartLineView } from "@/modules/cart";

import { setCartView, showNotice } from "./cart-store";

type Preference = CartLineView["substitution"]["preference"];
type Alternative = { id: string; name: string; priceCents: number };

const OPTIONS: Preference[] = ["allow", "preferred", "none"];

/**
 * What to do if this Product is out at pick time (CRT-3): three radio
 * cards behind a link that shows the current choice.
 */
export function SubstitutionSelect({
  productId,
  name,
  value,
}: {
  productId: string;
  name: string;
  value: CartLineView["substitution"];
}) {
  const id = useId();
  const t = useMessages().cart;
  const words = t.substitution;
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Preference>(value.preference);
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(preference: Preference, preferred: string | null) {
    setSaving(true);
    try {
      const result = await chooseSubstitution(productId, preference, preferred);
      setCartView(result.cart);
      if (result.notice) showNotice(productId, t.notices[result.notice]);
    } catch {
      showNotice(productId, t.failed.save);
    } finally {
      setSaving(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    setChoice(value.preference);
    if (next && alternatives === null) {
      listAlternatives(productId).then(setAlternatives, () =>
        setAlternatives([])
      );
    }
  }

  function pick(preference: Preference) {
    setChoice(preference);
    // "I'll choose" saves once an item is picked below.
    if (preference !== "preferred") void save(preference, null);
  }

  const current = words[value.preference];
  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="decoration-border-strong mt-1 inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold underline underline-offset-[3px]"
      >
        <SwapIcon size={15} aria-hidden />
        {current.label}
        <span className="sr-only">{words.ifOut(name)}</span>
      </button>
      {open && (
        <fieldset
          id={`${id}-panel`}
          aria-busy={saving}
          className="mt-2 grid gap-2"
        >
          <legend className="mb-2 text-[13px] font-semibold">
            {words.legend}
          </legend>
          {OPTIONS.map((option) => (
            <label
              key={option}
              className="rounded-field border-border-strong bg-card has-[:checked]:border-ink has-[:focus-visible]:outline-ring flex cursor-pointer items-start gap-3 border px-3.5 py-3 has-[:checked]:border-2 has-[:checked]:px-[13px] has-[:checked]:py-[11px] has-[:focus-visible]:outline-2"
            >
              <input
                type="radio"
                name={`${id}-choice`}
                value={option}
                checked={choice === option}
                onChange={() => pick(option)}
                className="accent-ink mt-0.5 size-5 shrink-0"
              />
              <span>
                <span className="block text-sm font-bold">
                  {words[option].label}
                </span>
                <span className="text-muted-foreground block text-[13px] leading-[18px]">
                  {words[option].hint}
                </span>
              </span>
            </label>
          ))}
          {choice === "preferred" && (
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-alt`} className="text-sm font-semibold">
                {words.useInstead}
              </label>
              <select
                id={`${id}-alt`}
                value={
                  value.preference === "preferred"
                    ? (value.preferredProductId ?? "")
                    : ""
                }
                disabled={alternatives === null}
                onChange={(e) =>
                  e.target.value && void save("preferred", e.target.value)
                }
                className="rounded-field border-input bg-card h-11 border px-3 text-base"
              >
                <option value="">
                  {alternatives === null ? words.loading : words.choose}
                </option>
                {alternatives?.map((alt) => (
                  <option key={alt.id} value={alt.id}>
                    {alt.name}, {formatMoney(alt.priceCents)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
