"use client";

import { useActionState } from "react";

import { formKey } from "@/components/form-key";
import { Button } from "@/components/ui/button";

import { FormMessage } from "../form-message";
import {
  addStaffAction,
  updateStaffAction,
  type StaffFormState,
} from "./actions";

const initial: StaffFormState = { errors: {} };
const FIELD =
  "rounded-field border-input bg-card h-11 border px-3 text-base font-normal";
export const ROLES = {
  admin: "Admin: everything",
  merchandiser: "Merchandiser: Products and Categories",
  content_editor: "Content Editor: Recipes and Articles",
  dispatcher: "Dispatcher: dispatch, cash, the order queue",
  picker: "Picker: picking",
  rider: "Rider: their deliveries",
} as const;

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addStaffAction, initial);
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="grid gap-1 text-sm font-semibold">
        Name
        <input name="name" maxLength={80} className={FIELD} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Email they sign in with
        <input name="email" type="email" className={`${FIELD} w-72`} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Mobile (Riders: shown to Customers)
        <input name="phone" type="tel" inputMode="tel" className={FIELD} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Role
        <select name="role" defaultValue="picker" className={FIELD}>
          {Object.entries(ROLES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add to staff"}
      </Button>
      <div className="basis-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function StaffRowForm({
  id,
  name,
  role,
  isActive,
}: {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateStaffAction.bind(null, id),
    initial
  );
  return (
    <form
      key={formKey(state)}
      action={action}
      className="flex flex-wrap items-center gap-3"
    >
      <label className="sr-only" htmlFor={`role-${id}`}>
        Role of {name}
      </label>
      <select
        id={`role-${id}`}
        name="role"
        defaultValue={role}
        className={FIELD}
      >
        {Object.entries(ROLES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={isActive}
          className="accent-ink size-5"
        />
        Can sign in
      </label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Save {name}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
