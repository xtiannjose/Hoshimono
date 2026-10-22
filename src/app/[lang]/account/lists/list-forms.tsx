"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useActionState, useTransition } from "react";

import { formKey } from "@/components/form-key";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Button } from "@/components/ui/button";

import {
  createListAction,
  deleteListAction,
  removeFromListAction,
  renameListAction,
  setListQuantityAction,
  type ListFormState,
} from "./actions";

const FIELD =
  "rounded-field border-input bg-card min-h-11 w-full border px-3 text-base";
const initial: ListFormState = { errors: {} };

function NameForm({
  action,
  id,
  label,
  button,
  defaultValue,
}: {
  action: (prev: ListFormState, fd: FormData) => Promise<ListFormState>;
  id: string;
  label: string;
  button: string;
  defaultValue?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form
      key={formKey(state)}
      action={formAction}
      className="flex max-w-md flex-wrap items-end gap-2"
    >
      <div className="grid min-w-0 flex-1 gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        <input
          id={id}
          name="name"
          defaultValue={defaultValue}
          maxLength={60}
          className={FIELD}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {button}
      </Button>
      {state.errors.name && (
        <p role="alert" className="text-err basis-full text-sm font-semibold">
          {state.errors.name}
        </p>
      )}
      {state.saved && (
        <p role="status" className="basis-full text-sm font-semibold">
          Saved.
        </p>
      )}
    </form>
  );
}

export function CreateListForm() {
  return (
    <NameForm
      action={createListAction}
      id="new-list"
      label="Name a new list"
      button="Make the list"
    />
  );
}

export function RenameListForm({ id, name }: { id: string; name: string }) {
  return (
    <NameForm
      action={renameListAction.bind(null, id)}
      id="rename-list"
      label="Rename the list"
      button="Rename"
      defaultValue={name}
    />
  );
}

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteListAction.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`Delete the list "${name}"?`)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="ghost" className="text-err">
        Delete this list
      </Button>
    </form>
  );
}

/** A list item's count and remove button. */
export function ListItemControls({
  listId,
  productId,
  name,
  quantity,
}: {
  listId: string;
  productId: string;
  name: string;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <div className="w-[132px]">
        <QuantityStepper
          value={quantity}
          min={1}
          label={`How many ${name}`}
          variant="ghost"
          onChange={(next) =>
            startTransition(() =>
              setListQuantityAction(listId, productId, next)
            )
          }
        />
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Remove ${name} from the list`}
        disabled={pending}
        onClick={() =>
          startTransition(() => removeFromListAction(listId, productId))
        }
      >
        <TrashIcon aria-hidden />
      </Button>
    </div>
  );
}
