"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";

import { Button } from "@/components/ui/button";

import {
  addCategory,
  editCategory,
  removeCategory,
  type FormState,
} from "../actions";
import { INLINE_FIELD as FIELD } from "@/components/ui/field-classes";

const initial: FormState = { errors: {} };

type Option = { value: string; label: string };

/** One Category row: rename, move under another parent, reorder, delete. */
export function CategoryRow({
  id,
  name,
  parentId,
  sortOrder,
  searchWords,
  productCount,
  depth,
  parents,
}: {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  /** Words its Products also answer to in search, such as "meat" for Pork. */
  searchWords: string;
  productCount: number;
  depth: number;
  parents: Option[];
}) {
  const [saved, save, saving] = useActionState(
    editCategory.bind(null, id),
    initial
  );
  const [removed, remove, removing] = useActionState(
    removeCategory.bind(null, id),
    initial
  );
  const message =
    saved.errors.name ??
    saved.errors.parent ??
    saved.errors.searchWords ??
    saved.errors.form ??
    removed.errors.form;
  return (
    <li
      className="border-border grid gap-1 border-t py-3"
      style={{ paddingLeft: depth * 24 }}
    >
      <form
        key={formKey(saved)}
        action={save}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="grid gap-1 text-xs font-semibold">
          Name
          <input
            name="name"
            defaultValue={name}
            aria-label={`Name of ${name}`}
            className={FIELD}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Parent
          <select
            name="parentId"
            defaultValue={parentId ?? ""}
            className={FIELD}
          >
            <option value="">(top level)</option>
            {parents
              .filter((p) => p.value !== id)
              .map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Order
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={sortOrder}
            className={`${FIELD} w-20`}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold">
          Also found by
          <input
            name="searchWords"
            defaultValue={searchWords}
            maxLength={60}
            placeholder="meat"
            aria-label={`Search words for ${name}`}
            aria-describedby={`search-words-${id}`}
            className={FIELD}
          />
        </label>
        <Button type="submit" size="sm" variant="secondary" disabled={saving}>
          Save
        </Button>
        <span className="text-muted-foreground pb-2 text-sm">
          {productCount} Products
        </span>
      </form>
      <p id={`search-words-${id}`} className="text-muted-foreground text-xs">
        Words shoppers may type for this aisle besides its name, such as
        &ldquo;meat&rdquo; for Pork.
      </p>
      <form action={remove}>
        <Button type="submit" size="sm" variant="ghost" disabled={removing}>
          Delete {name}
        </Button>
      </form>
      {message && (
        <p role="alert" className="text-err text-sm">
          {message}
        </p>
      )}
      {saved.saved && !message && (
        <p role="status" className="text-sm font-semibold">
          Saved.
        </p>
      )}
    </li>
  );
}

export function NewCategoryForm({ parents }: { parents: Option[] }) {
  const [state, action, pending] = useActionState(addCategory, initial);
  const message = state.errors.name ?? state.errors.parent;
  return (
    <form
      key={formKey(state)}
      action={action}
      className="rounded-card border-border bg-card flex max-w-3xl flex-wrap items-end gap-3 border p-4"
    >
      <label className="grid gap-1 text-sm font-semibold">
        New Category name
        <input name="name" required className={FIELD} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Under
        <select name="parent" defaultValue="" className={FIELD}>
          <option value="">(top level)</option>
          {parents.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        Add Category
      </Button>
      {message && (
        <p role="alert" className="text-err w-full text-sm">
          {message}
        </p>
      )}
      {state.saved && (
        <p role="status" className="w-full text-sm font-semibold">
          Category added.
        </p>
      )}
    </form>
  );
}
