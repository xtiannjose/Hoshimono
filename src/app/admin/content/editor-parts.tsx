"use client";

import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

// Pieces shared by the Recipe and Article editors (ADR 0013).

export type ProductChoice = { id: string; label: string };

export const FIELD =
  "rounded-field border-input bg-card min-h-11 w-full border px-3 text-base font-normal";

export const PRODUCT_LIST = "product-choices";

/** The catalogue for every Product field on the page (native datalist). */
export function ProductChoices({ products }: { products: ProductChoice[] }) {
  return (
    <datalist id={PRODUCT_LIST}>
      {products.map((p) => (
        <option key={p.id} value={p.label} />
      ))}
    </datalist>
  );
}

/** Move up, move down and remove buttons for one row of a list. */
export function RowTools({
  index,
  count,
  what,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  /** "step 2", "ingredient 3": named for screen readers. */
  what: string;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Move ${what} up`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUpIcon aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Move ${what} down`}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDownIcon aria-hidden />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Remove ${what}`}
        onClick={onRemove}
      >
        <TrashIcon aria-hidden />
      </Button>
    </div>
  );
}

/** A copy of `list` with the item at `from` moved to `to`. */
export function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** An error for one part of the form, read out when it appears. */
export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-err text-sm font-semibold">
      {message}
    </p>
  ) : null;
}

export function Labeled({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-muted-foreground text-[13px]">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

/** A stable key for a new row (lists are reordered, so not the index). */
let next = 0;
export const rowKey = () => `row-${++next}`;
