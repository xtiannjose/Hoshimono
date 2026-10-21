"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  FIELD,
  FieldError,
  Labeled,
  PRODUCT_LIST,
  ProductChoices,
  RowTools,
  moved,
  type ProductChoice,
} from "../content/editor-parts";
import { FormMessage } from "../form-message";
import { savePromotionAction, type OfferFormState } from "./actions";

export type PromotionValues = {
  name: string;
  kind: "percent" | "amount";
  /** Percent as typed, or pesos such as "20.00". */
  value: string;
  productIds: string[];
  categoryIds: string[];
  /** datetime-local in Manila. */
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

type CategoryChoice = {
  id: string;
  name: string;
  children: { id: string; name: string }[];
};

const initial: OfferFormState = { errors: {} };

/** A Promotion on one page, no code needed (ADR 0015). */
export function PromotionForm({
  id,
  values,
  products,
  categories,
}: {
  id: string | null;
  values: PromotionValues;
  products: ProductChoice[];
  categories: CategoryChoice[];
}) {
  const [state, action, pending] = useActionState(
    savePromotionAction.bind(null, id),
    initial
  );
  const [v, setV] = useState(values);
  const [finding, setFinding] = useState("");
  const set = (patch: Partial<PromotionValues>) =>
    setV((now) => ({ ...now, ...patch }));
  const labelOf = new Map(products.map((p) => [p.id, p.label]));
  const found = products.find((p) => p.label === finding)?.id;
  const e = state.errors;
  const toggleCategory = (categoryId: string, on: boolean) =>
    set({
      categoryIds: on
        ? [...v.categoryIds, categoryId]
        : v.categoryIds.filter((c) => c !== categoryId),
    });

  return (
    <form action={action} className="grid max-w-3xl gap-8">
      <ProductChoices products={products} />
      {v.productIds.map((p) => (
        <input key={p} type="hidden" name="productIds" value={p} />
      ))}

      <section aria-labelledby="what-h" className="grid gap-4">
        <h2 id="what-h" className="type-h3">
          The offer
        </h2>
        <Labeled
          label="Name"
          htmlFor="name"
          hint="Shown on the shelf, such as Dairy week."
          error={e.name}
        >
          <input
            id="name"
            name="name"
            value={v.name}
            onChange={(ev) => set({ name: ev.target.value })}
            className={FIELD}
          />
        </Labeled>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled label="Kind" htmlFor="kind">
            <select
              id="kind"
              name="kind"
              value={v.kind}
              onChange={(ev) =>
                set({ kind: ev.target.value as PromotionValues["kind"] })
              }
              className={FIELD}
            >
              <option value="percent">Percent off</option>
              <option value="amount">Pesos off each item</option>
            </select>
          </Labeled>
          <Labeled
            label={v.kind === "percent" ? "Percent off" : "Pesos off each (₱)"}
            htmlFor="value"
            error={e.value}
          >
            <input
              id="value"
              name="value"
              inputMode="decimal"
              value={v.value}
              onChange={(ev) => set({ value: ev.target.value })}
              className={FIELD}
            />
          </Labeled>
        </div>
      </section>

      <section aria-labelledby="on-h" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="on-h" className="type-h3">
            What it is on
          </h2>
          <p className="text-muted-foreground text-sm">
            Whole Categories, chosen Products, or both. A top-level Category
            covers everything under it.
          </p>
        </div>
        <FieldError message={e.targets} />
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Categories</legend>
          {categories.map((c) => (
            <div key={c.id} className="grid gap-1">
              <label className="flex min-h-9 items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={c.id}
                  checked={v.categoryIds.includes(c.id)}
                  onChange={(ev) => toggleCategory(c.id, ev.target.checked)}
                  className="accent-ink size-5"
                />
                {c.name}
              </label>
              {c.children.map((child) => (
                <label
                  key={child.id}
                  className="flex min-h-9 items-center gap-2 pl-7 text-sm"
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={child.id}
                    checked={v.categoryIds.includes(child.id)}
                    onChange={(ev) =>
                      toggleCategory(child.id, ev.target.checked)
                    }
                    className="accent-ink size-5"
                  />
                  {child.name}
                </label>
              ))}
            </div>
          ))}
        </fieldset>
        {v.productIds.length > 0 && (
          <ol className="grid gap-2">
            {v.productIds.map((productId, index) => (
              <li
                key={productId}
                className="border-border flex flex-wrap items-center justify-between gap-2 border-b pb-2"
              >
                <span>
                  {labelOf.get(productId) ?? "A Product no longer sold"}
                </span>
                <RowTools
                  index={index}
                  count={v.productIds.length}
                  what={labelOf.get(productId) ?? `Product ${index + 1}`}
                  onMove={(to) =>
                    set({ productIds: moved(v.productIds, index, to) })
                  }
                  onRemove={() =>
                    set({
                      productIds: v.productIds.filter((p) => p !== productId),
                    })
                  }
                />
              </li>
            ))}
          </ol>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Labeled label="Add a Product" htmlFor="find-product">
              <input
                id="find-product"
                list={PRODUCT_LIST}
                value={finding}
                onChange={(ev) => setFinding(ev.target.value)}
                className={FIELD}
              />
            </Labeled>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!found || v.productIds.includes(found)}
            onClick={() => {
              if (found) set({ productIds: [...v.productIds, found] });
              setFinding("");
            }}
          >
            <PlusIcon aria-hidden />
            Add Product
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="when-h"
        className="rounded-card border-border bg-card grid gap-4 border p-4"
      >
        <h2 id="when-h" className="type-h3">
          When
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labeled
            label="Starts (Manila time)"
            htmlFor="startsAt"
            error={e.startsAt}
          >
            <input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              value={v.startsAt}
              onChange={(ev) => set({ startsAt: ev.target.value })}
              className={FIELD}
            />
          </Labeled>
          <Labeled label="Ends (Manila time)" htmlFor="endsAt" error={e.endsAt}>
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              value={v.endsAt}
              onChange={(ev) => set({ endsAt: ev.target.value })}
              className={FIELD}
            />
          </Labeled>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="isActive"
            checked={v.isActive}
            onChange={(ev) => set({ isActive: ev.target.checked })}
            className="accent-ink size-5"
          />
          On (untick to pause it)
        </label>
        <FieldError message={e.form} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : id ? "Save changes" : "Create Promotion"}
          </Button>
          {state.saved && <FormMessage state={state} />}
        </div>
      </section>
    </form>
  );
}
