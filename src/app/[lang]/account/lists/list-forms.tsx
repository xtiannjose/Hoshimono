"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useActionState, useTransition } from "react";

import { formKey } from "@/components/form-key";
import { QuantityStepper } from "@/components/product/quantity-stepper";
import { Button } from "@/components/ui/button";
import { useLang, useMessages } from "@/i18n/client";

import {
  createListAction,
  deleteListAction,
  removeFromListAction,
  renameListAction,
  setListQuantityAction,
  type ListFormState,
} from "./actions";
import { FIELD } from "@/components/ui/field-classes";

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
  const lang = useLang();
  const t = useMessages().lists;
  return (
    <form
      key={formKey(state)}
      action={formAction}
      className="flex max-w-md flex-wrap items-end gap-2"
    >
      <input type="hidden" name="lang" value={lang} />
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
          {t.saved}
        </p>
      )}
    </form>
  );
}

export function CreateListForm() {
  const t = useMessages().lists;
  return (
    <NameForm
      action={createListAction}
      id="new-list"
      label={t.newName}
      button={t.create}
    />
  );
}

export function RenameListForm({ id, name }: { id: string; name: string }) {
  const t = useMessages().lists;
  return (
    <NameForm
      action={renameListAction.bind(null, id)}
      id="rename-list"
      label={t.renameLabel}
      button={t.rename}
      defaultValue={name}
    />
  );
}

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  const lang = useLang();
  const t = useMessages().lists;
  return (
    <form
      action={deleteListAction.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(t.confirmDelete(name))) e.preventDefault();
      }}
    >
      <input type="hidden" name="lang" value={lang} />
      <Button type="submit" variant="danger">
        {t.delete}
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
  const t = useMessages().lists;
  return (
    <div className="flex items-center gap-2">
      <div className="w-[132px]">
        <QuantityStepper
          value={quantity}
          min={1}
          label={t.howMany(name)}
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
        size="icon"
        variant="ghost"
        aria-label={t.remove(name)}
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
