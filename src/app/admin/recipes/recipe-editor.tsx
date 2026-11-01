"use client";

import { CheckCircleIcon, PlusIcon } from "@phosphor-icons/react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import { saveRecipeAction, type ContentFormState } from "../content/actions";
import {
  FIELD,
  INLINE_FIELD,
  TEXTAREA,
  FieldError,
  Labeled,
  moved,
  PRODUCT_LIST,
  ProductChoices,
  rowKey,
  RowTools,
  type ProductChoice,
} from "../content/editor-parts";
import { FormMessage } from "../form-message";

export type RecipeDraft = {
  title: string;
  intro: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  status: "draft" | "published";
  featured: boolean;
  steps: string[];
  ingredients: {
    productId: string | null;
    label: string;
    note: string;
    quantity: number;
    scales: boolean;
    optional: boolean;
  }[];
};

type Ingredient = RecipeDraft["ingredients"][number] & {
  key: string;
  /** What is typed in the "What" field. */
  what: string;
};

const initial: ContentFormState = { errors: {} };

/**
 * Everything about a Recipe on one page, no code needed (ADR 0013). The
 * draft is held here and sent whole, so a refused save keeps every field.
 */
export function RecipeEditor({
  id,
  recipe,
  products,
}: {
  id: string | null;
  recipe: RecipeDraft;
  products: ProductChoice[];
}) {
  const [state, action, pending] = useActionState(
    saveRecipeAction.bind(null, id),
    initial
  );
  const labelOf = new Map(products.map((p) => [p.id, p.label]));
  const idOf = new Map(products.map((p) => [p.label, p.id]));

  const [fields, setFields] = useState({
    title: recipe.title,
    intro: recipe.intro,
    servings: String(recipe.servings),
    prepMinutes: String(recipe.prepMinutes),
    cookMinutes: String(recipe.cookMinutes),
    status: recipe.status,
    featured: recipe.featured,
  });
  const [steps, setSteps] = useState(() =>
    recipe.steps.map((text) => ({ key: rowKey(), text }))
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>(() =>
    recipe.ingredients.map((i) => ({
      ...i,
      key: rowKey(),
      what: i.productId ? (labelOf.get(i.productId) ?? i.label) : i.label,
    }))
  );
  const set = (patch: Partial<typeof fields>) =>
    setFields((f) => ({ ...f, ...patch }));
  const setIngredient = (key: string, patch: Partial<Ingredient>) =>
    setIngredients((list) =>
      list.map((i) => (i.key === key ? { ...i, ...patch } : i))
    );

  const draft: RecipeDraft = {
    title: fields.title,
    intro: fields.intro,
    servings: Number(fields.servings),
    prepMinutes: Number(fields.prepMinutes || 0),
    cookMinutes: Number(fields.cookMinutes || 0),
    status: fields.status,
    featured: fields.featured,
    steps: steps.map((s) => s.text),
    ingredients: ingredients.map((i) => ({
      productId: i.productId,
      label: i.productId ? "" : i.what,
      note: i.note,
      quantity: i.quantity,
      scales: i.scales,
      optional: i.optional,
    })),
  };
  const e = state.errors;

  return (
    <form action={action} className="grid max-w-4xl gap-8">
      <input type="hidden" name="draft" value={JSON.stringify(draft)} />
      <ProductChoices products={products} />

      <section aria-labelledby="about-h" className="grid gap-4">
        <h2 id="about-h" className="type-h3">
          About the Recipe
        </h2>
        <Labeled label="Title" htmlFor="title" error={e.title}>
          <input
            id="title"
            value={fields.title}
            onChange={(ev) => set({ title: ev.target.value })}
            className={FIELD}
          />
        </Labeled>
        <Labeled
          label="Intro"
          htmlFor="intro"
          hint="One or two sentences on the list and at the top of the page."
          error={e.intro}
        >
          <textarea
            id="intro"
            rows={3}
            value={fields.intro}
            onChange={(ev) => set({ intro: ev.target.value })}
            className={TEXTAREA}
          />
        </Labeled>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labeled
            label="Serves"
            htmlFor="servings"
            hint="The counts to buy below are for this many."
            error={e.servings}
          >
            <input
              id="servings"
              type="number"
              min={1}
              max={50}
              value={fields.servings}
              onChange={(ev) => set({ servings: ev.target.value })}
              className={FIELD}
            />
          </Labeled>
          <Labeled label="Prep minutes" htmlFor="prep" error={e.prepMinutes}>
            <input
              id="prep"
              type="number"
              min={0}
              value={fields.prepMinutes}
              onChange={(ev) => set({ prepMinutes: ev.target.value })}
              className={FIELD}
            />
          </Labeled>
          <Labeled label="Cook minutes" htmlFor="cook" error={e.cookMinutes}>
            <input
              id="cook"
              type="number"
              min={0}
              value={fields.cookMinutes}
              onChange={(ev) => set({ cookMinutes: ev.target.value })}
              className={FIELD}
            />
          </Labeled>
        </div>
      </section>

      <section aria-labelledby="ing-h" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="ing-h" className="type-h3">
            Ingredients
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Type to find a Product in the catalogue; its price and photo come
            from there. Anything we do not sell (water) is shown as text.
          </p>
        </div>
        <FieldError message={e.ingredients} />
        <ol className="grid gap-3">
          {ingredients.map((i, index) => {
            const n = index + 1;
            return (
              <li
                key={i.key}
                aria-label={`Ingredient ${n}`}
                className="rounded-card border-border bg-card grid gap-3 border p-4"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <Labeled label={`What (${n})`} htmlFor={`what-${i.key}`}>
                    <input
                      id={`what-${i.key}`}
                      list={PRODUCT_LIST}
                      value={i.what}
                      onChange={(ev) =>
                        setIngredient(i.key, {
                          what: ev.target.value,
                          productId: idOf.get(ev.target.value) ?? null,
                        })
                      }
                      className={FIELD}
                    />
                    <span className="text-muted-foreground text-fine flex items-center gap-1">
                      {i.productId ? (
                        <>
                          <CheckCircleIcon aria-hidden weight="fill" />
                          From the catalogue
                        </>
                      ) : i.what ? (
                        "Not sold here: shown as text"
                      ) : (
                        "Choose a Product or type a name"
                      )}
                    </span>
                  </Labeled>
                  <Labeled
                    label="How it is used"
                    htmlFor={`note-${i.key}`}
                    hint="Such as 6 cloves, crushed"
                  >
                    <input
                      id={`note-${i.key}`}
                      value={i.note}
                      onChange={(ev) =>
                        setIngredient(i.key, { note: ev.target.value })
                      }
                      className={FIELD}
                    />
                  </Labeled>
                  <div className="self-start md:pt-6">
                    <RowTools
                      index={index}
                      count={ingredients.length}
                      what={`ingredient ${n}`}
                      onMove={(to) =>
                        setIngredients((list) => moved(list, index, to))
                      }
                      onRemove={() =>
                        setIngredients((list) =>
                          list.filter((x) => x.key !== i.key)
                        )
                      }
                    />
                  </div>
                </div>
                {i.productId && (
                  <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                    <Labeled label="How many to buy" htmlFor={`qty-${i.key}`}>
                      <input
                        id={`qty-${i.key}`}
                        type="number"
                        min={1}
                        max={99}
                        value={i.quantity}
                        onChange={(ev) =>
                          setIngredient(i.key, {
                            quantity: Number(ev.target.value),
                          })
                        }
                        className={`${INLINE_FIELD} w-24`}
                      />
                    </Labeled>
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={i.scales}
                        onChange={(ev) =>
                          setIngredient(i.key, { scales: ev.target.checked })
                        }
                        className="accent-ink size-5"
                      />
                      Buy more for more servings
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={i.optional}
                        onChange={(ev) =>
                          setIngredient(i.key, { optional: ev.target.checked })
                        }
                        className="accent-ink size-5"
                      />
                      Usually at home (starts unticked)
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setIngredients((list) => [
                ...list,
                {
                  key: rowKey(),
                  what: "",
                  productId: null,
                  label: "",
                  note: "",
                  quantity: 1,
                  scales: true,
                  optional: false,
                },
              ])
            }
          >
            <PlusIcon aria-hidden />
            Add ingredient
          </Button>
        </div>
      </section>

      <section aria-labelledby="steps-h" className="grid gap-4">
        <h2 id="steps-h" className="type-h3">
          Steps
        </h2>
        <FieldError message={e.steps} />
        <ol className="grid gap-3">
          {steps.map((s, index) => (
            <li key={s.key} className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Labeled label={`Step ${index + 1}`} htmlFor={`step-${s.key}`}>
                <textarea
                  id={`step-${s.key}`}
                  rows={3}
                  value={s.text}
                  onChange={(ev) =>
                    setSteps((list) =>
                      list.map((x) =>
                        x.key === s.key ? { ...x, text: ev.target.value } : x
                      )
                    )
                  }
                  className={TEXTAREA}
                />
              </Labeled>
              <div className="self-start md:pt-6">
                <RowTools
                  index={index}
                  count={steps.length}
                  what={`step ${index + 1}`}
                  onMove={(to) => setSteps((list) => moved(list, index, to))}
                  onRemove={() =>
                    setSteps((list) => list.filter((x) => x.key !== s.key))
                  }
                />
              </div>
            </li>
          ))}
        </ol>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSteps((list) => [...list, { key: rowKey(), text: "" }])
            }
          >
            <PlusIcon aria-hidden />
            Add step
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="publish-h"
        className="rounded-card border-border bg-card grid gap-4 border p-4"
      >
        <h2 id="publish-h" className="type-h3">
          Publishing
        </h2>
        <div className="flex flex-wrap items-end gap-6">
          <Labeled label="Status" htmlFor="status">
            <select
              id="status"
              value={fields.status}
              onChange={(ev) =>
                set({ status: ev.target.value as RecipeDraft["status"] })
              }
              className={`${INLINE_FIELD} w-56`}
            >
              <option value="draft">Draft: only staff see it</option>
              <option value="published">Published: on the shop</option>
            </select>
          </Labeled>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={fields.featured}
              onChange={(ev) => set({ featured: ev.target.checked })}
              className="accent-ink size-5"
            />
            Feature on Home
          </label>
        </div>
        <FieldError message={e.status} />
        <FieldError message={e.form} />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : id ? "Save changes" : "Create Recipe"}
          </Button>
          {state.saved && <FormMessage state={state} />}
        </div>
      </section>
    </form>
  );
}
