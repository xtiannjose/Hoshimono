"use client";

import { ListPlusIcon } from "@phosphor-icons/react";
import Link from "@/components/link";
import { useActionState, useState } from "react";

import { type ListFormState } from "@/app/[lang]/account/lists/actions";
import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";

const FIELD =
  "rounded-field border-input bg-card min-h-11 w-full border px-3 text-base";
const initial: ListFormState = { errors: {} };

/**
 * Save to a Shopping List (ADR 0014): pick a list, or name a new one. Used
 * on a Product page (one item) and the Cart page (every line).
 */
export function SaveToList({
  action,
  lists,
  summary,
  done,
}: {
  action: (prev: ListFormState, fd: FormData) => Promise<ListFormState>;
  lists: { id: string; name: string }[];
  /** The button that opens the form. */
  summary: string;
  /** What to say once saved. */
  done: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [listId, setListId] = useState(lists[0]?.id ?? "new");
  const error = Object.values(state.errors)[0];
  return (
    <details className="group">
      <summary className="rounded-pill border-input bg-card hover:bg-muted inline-flex min-h-11 cursor-pointer list-none items-center gap-2 border px-4 font-semibold [&::-webkit-details-marker]:hidden">
        <ListPlusIcon size={20} aria-hidden />
        {summary}
      </summary>
      <form
        key={formKey(state)}
        action={formAction}
        className="mt-3 grid max-w-sm gap-3"
      >
        {lists.length > 0 && (
          <div className="grid gap-1.5">
            <label htmlFor="list-choice" className="text-sm font-semibold">
              List
            </label>
            <select
              id="list-choice"
              name="listId"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className={FIELD}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value="new">A new list</option>
            </select>
          </div>
        )}
        {listId === "new" && (
          <div className="grid gap-1.5">
            <label htmlFor="list-name" className="text-sm font-semibold">
              Name of the new list
            </label>
            <input
              id="list-name"
              name="name"
              placeholder="Weekly"
              maxLength={60}
              className={FIELD}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="text-err text-sm font-semibold">
            {error}
          </p>
        )}
        {state.saved && (
          <p role="status" className="text-sm font-semibold">
            {done}{" "}
            <Link
              href="/account/lists"
              className="underline underline-offset-4"
            >
              See your lists
            </Link>
          </p>
        )}
        <div>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </details>
  );
}
