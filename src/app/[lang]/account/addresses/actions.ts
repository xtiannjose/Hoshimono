"use server";

import { redirect } from "next/navigation";

import { langOf, localPath } from "@/i18n/lang";
import { MESSAGES, type Messages } from "@/i18n/messages";
import {
  deleteAddress,
  MAX_ADDRESSES,
  saveAddress,
  setCustomerLang,
  setDefaultAddress,
  type AddressField,
  type AddressProblem,
} from "@/modules/customers";
import { requireCustomer, safeNext } from "@/modules/identity";

// Server Actions cannot read the language; the forms send it (ADR 0017).

export type AddressFormState = {
  errors: Partial<Record<AddressField, string>>;
  /** What was submitted, so the form refills after React resets it. */
  values?: Record<string, string | boolean>;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/** The module's answer in the page's language (ADR 0019). */
function explain(
  t: Messages["addresses"]["problems"],
  errors: Partial<Record<AddressField, AddressProblem>>,
  place: { barangay: string; city: string }
): AddressFormState["errors"] {
  const say = (problem: AddressProblem) =>
    problem === "not_served"
      ? t.not_served(place.barangay.trim(), place.city.trim())
      : problem === "too_many"
        ? t.too_many(MAX_ADDRESSES)
        : t[problem];
  return Object.fromEntries(
    Object.entries(errors).map(([field, problem]) => [field, say(problem)])
  );
}

export async function saveAddressAction(
  _prev: AddressFormState,
  fd: FormData
): Promise<AddressFormState> {
  const next = safeNext(text(fd, "next") || "/account/addresses");
  const customer = await requireCustomer(next);
  await setCustomerLang(customer.id, langOf(fd.get("lang")));
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
  if (!result.ok) {
    const t = MESSAGES[langOf(fd.get("lang"))].addresses.problems;
    return { errors: explain(t, result.errors, values), values };
  }
  // "{id}" in next becomes the saved address, so Checkout can select it.
  redirect(next.replace("{id}", result.address.id));
}

export async function deleteAddressAction(fd: FormData): Promise<void> {
  const customer = await requireCustomer("/account/addresses");
  await deleteAddress(customer.id, text(fd, "id"));
  redirect(localPath(langOf(fd.get("lang")), "/account/addresses"));
}

export async function makeDefaultAction(fd: FormData): Promise<void> {
  const customer = await requireCustomer("/account/addresses");
  await setDefaultAddress(customer.id, text(fd, "id"));
  redirect(localPath(langOf(fd.get("lang")), "/account/addresses"));
}
