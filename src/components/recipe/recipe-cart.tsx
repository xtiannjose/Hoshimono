"use client";

import { ClockIcon, ShoppingCartIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";

import { addRecipe } from "@/app/recipes/actions";
import { setCartOpen, setCartView } from "@/components/cart/cart-store";
import { announce } from "@/components/live-region";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Tag } from "@/components/product/tag";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { scaledCount } from "@/lib/servings";

import type { RecipeExtra, RecipeRow, RowProduct } from "./recipe-rows";

const MAX_SERVINGS = 20;

type Props = {
  slug: string;
  /** "Ingredients" or the Recipe's title; the servings follow ("... for 4"). */
  heading: string;
  headingLevel?: "h2" | "h3";
  baseServings: number;
  minutes: number;
  rows: RecipeRow[];
  extras: RecipeExtra[];
  /** A link beside the button, such as "See the full recipe". */
  more?: { href: string; label: string };
};

/**
 * Servings, ingredient ticks and one button that adds them to the Cart
 * (CAT-7, ADR 0013). Counts and prices here are a preview; the server
 * recomputes both.
 */
export function RecipeCart({
  slug,
  heading,
  headingLevel: H = "h2",
  baseServings,
  minutes,
  rows,
  extras,
  more,
}: Props) {
  const id = useId();
  const [servings, setServings] = useState(baseServings);
  // Row id to the Product chosen for it: the ingredient's, or the similar one.
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.flatMap((r) =>
        !r.optional && !r.soldOut && r.product ? [[r.id, r.product.id]] : []
      )
    )
  );
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const count = (r: RecipeRow) => scaledCount(r, servings, baseServings);
  const productFor = (r: RecipeRow): RowProduct | null =>
    picked[r.id] === r.product?.id
      ? r.product
      : picked[r.id] === r.alternative?.id
        ? r.alternative
        : null;
  const chosen = rows.flatMap((r) => {
    const p = productFor(r);
    return p ? [{ row: r, product: p }] : [];
  });
  const items = chosen.reduce((sum, c) => sum + count(c.row), 0);
  const total = chosen.reduce(
    (sum, c) => sum + count(c.row) * c.product.priceCents,
    0
  );

  function toggle(rowId: string, productId: string, on: boolean) {
    setPicked((now) => {
      const next = { ...now };
      if (on) next[rowId] = productId;
      else delete next[rowId];
      return next;
    });
  }

  function add() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await addRecipe(
          slug,
          servings,
          chosen.map((c) => ({
            ingredientId: c.row.id,
            productId: c.product.id,
          }))
        );
        setCartView(result.cart);
        setMessage(result.message ?? "");
        announce(result.message ?? "");
      } catch {
        setMessage("We could not add these. Please try again.");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <H id={`${id}-h`} className="type-h2">
          {heading} for {servings}
        </H>
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-[148px]">
            <QuantityStepper
              value={servings}
              onChange={setServings}
              label="Servings"
              min={1}
              max={MAX_SERVINGS}
              variant="ghost"
              decreaseLabel="Fewer servings"
              increaseLabel="More servings"
            />
          </div>
          <span className="text-muted-foreground text-sm">Servings</span>
          {minutes > 0 && (
            <Tag tone="quiet">
              <ClockIcon size={14} aria-hidden />
              {minutes} minutes
            </Tag>
          )}
        </div>
        <p className="text-muted-foreground max-w-[52ch] text-sm">
          Untick anything you already have at home.
        </p>
      </div>

      <fieldset className="grid">
        <legend className="sr-only">Ingredients to add</legend>
        <ul className="divide-border grid divide-y">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-1 py-2.5">
              <Choice
                row={r}
                product={r.product}
                count={count(r)}
                checked={picked[r.id] === r.product?.id}
                disabled={r.soldOut}
                onChange={(on) => r.product && toggle(r.id, r.product.id, on)}
              />
              {r.soldOut && r.alternative && (
                <div className="pl-8">
                  <Choice
                    row={r}
                    product={r.alternative}
                    count={count(r)}
                    checked={picked[r.id] === r.alternative.id}
                    instead
                    onChange={(on) =>
                      r.alternative && toggle(r.id, r.alternative.id, on)
                    }
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </fieldset>

      {extras.length > 0 && (
        <p className="text-muted-foreground text-sm">
          You will also need{" "}
          {extras
            .map((e) => (e.note ? `${e.name} (${e.note})` : e.name))
            .join(", ")}
          .
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        {more && (
          <Link
            href={more.href}
            className="decoration-border-strong inline-flex min-h-11 items-center font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
          >
            {more.label}
          </Link>
        )}
        <Button
          size="lg"
          onClick={add}
          disabled={items === 0 || pending}
          className="max-sm:w-full"
        >
          <ShoppingCartIcon aria-hidden />
          {items === 0
            ? "Tick what you need"
            : pending
              ? "Adding..."
              : `Add ${items} ${items === 1 ? "item" : "items"}, ${formatMoney(total)}`}
        </Button>
      </div>
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

function Choice({
  row,
  product,
  count,
  checked,
  disabled = false,
  instead = false,
  onChange,
}: {
  row: RecipeRow;
  product: RowProduct | null;
  count: number;
  checked: boolean;
  disabled?: boolean;
  instead?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-11 items-start gap-3 ${disabled ? "text-muted-foreground" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-ink mt-0.5 size-5 shrink-0"
      />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="font-medium">
          {instead && "Instead: "}
          {instead || !product ? (product?.name ?? row.name) : row.name}
          {product && (
            <span className="text-muted-foreground font-normal">
              , {product.pack}
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-sm">
          {!instead && row.note}
          {!instead &&
            row.optional &&
            (row.note ? ". " : "") + "Usually at home"}
        </span>
      </span>
      <span className="grid shrink-0 justify-items-end gap-0.5 text-sm">
        {disabled ? (
          <Tag tone="warn">{product ? "Sold out" : "No longer sold"}</Tag>
        ) : (
          product && (
            <>
              <span className="font-semibold tabular-nums">
                {formatMoney(count * product.priceCents)}
              </span>
              {count > 1 && (
                <span className="text-muted-foreground tabular-nums">
                  {count} x {formatMoney(product.priceCents)}
                </span>
              )}
            </>
          )
        )}
      </span>
    </label>
  );
}
