"use server";

import { redirect } from "next/navigation";

import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
  type AddressField,
} from "@/modules/customers";
import { requireCustomer, safeNext } from "@/modules/identity";

export type AddressFormState = {
  errors: Partial<Record<AddressField, string>>;
  /** What was submitted, so the form refills after React resets it. */
  values?: Record<string, string | boolean>;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

export async function saveAddressAction(
  _prev: AddressFormState,
  fd: FormData
): Promise<AddressFormState> {
  const next = safeNext(text(fd, "next") || "/account/addresses");
  const customer = await requireCustomer(next);
  const values = {
    label: text(fd, "label"),
    line1: text(fd, "line1"),
    barangay: text(fd, "barangay"),
    city: text(fd, "city"),
    landmark: text(fd, "landmark"),
    notes: text(fd, "notes"),
    isDefault: fd.get("isDefault") === "on",
  };
  const id = text(fd, "id") || undefined;
  const result = await saveAddress(customer.id, values, id);
  if (!result.ok) return { errors: result.errors, values };
  // "{id}" in next becomes the saved address, so Checkout can select it.
  redirect(next.replace("{id}", result.address.id));
}

export async function deleteAddressAction(fd: FormData): Promise<void> {
  const customer = await requireCustomer("/account/addresses");
  await deleteAddress(customer.id, text(fd, "id"));
  redirect("/account/addresses");
}

export async function makeDefaultAction(fd: FormData): Promise<void> {
  const customer = await requireCustomer("/account/addresses");
  await setDefaultAddress(customer.id, text(fd, "id"));
  redirect("/account/addresses");
}
