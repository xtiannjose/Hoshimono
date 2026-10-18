"use client";

import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { saveProduct, type FormState } from "../actions";

export type ProductFormValues = {
  id?: string;
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  packSizeValue: string;
  packSizeUnit: string;
  price: string;
  compareAt: string;
  taxClass: string;
  isWeighed: boolean;
  storage: string;
  status: string;
  barcode: string;
  allergens: string;
  dietaryTags: string;
};

type Option = { value: string; label: string };

const FIELD =
  "h-11 w-full rounded-field border border-input bg-card px-3 text-base";
const initial: FormState = { errors: {} };

function Field({
  id,
  label,
  message,
  hint,
  children,
}: {
  id: string;
  label: string;
  message?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !message && (
        <p className="text-muted-foreground text-[13px]">{hint}</p>
      )}
      {message && (
        <p id={`${id}-error`} className="text-err text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

/** Create or edit a Product (PRD ADM-1). The server checks everything again. */
export function ProductForm({
  values,
  categories,
}: {
  values: ProductFormValues;
  categories: Option[];
}) {
  const [state, action, pending] = useActionState(saveProduct, initial);
  // React resets the form after an action; refill it with what was sent.
  const v = { ...values, ...state.values } as ProductFormValues;
  const field = (name: keyof ProductFormValues, errorKey: string = name) => {
    const message = state.errors[errorKey];
    return {
      control: {
        id: `f-${name}`,
        name,
        "aria-invalid": message ? true : undefined,
        "aria-describedby": message ? `f-${name}-error` : undefined,
      },
      label: { id: `f-${name}`, message },
    };
  };
  const f = {
    name: field("name"),
    brand: field("brand"),
    categoryId: field("categoryId"),
    status: field("status"),
    price: field("price", "priceCents"),
    compareAt: field("compareAt", "compareAtCents"),
    packSizeValue: field("packSizeValue"),
    packSizeUnit: field("packSizeUnit"),
    taxClass: field("taxClass"),
    storage: field("storage"),
    barcode: field("barcode"),
    description: field("description"),
    allergens: field("allergens"),
    dietaryTags: field("dietaryTags"),
  };

  return (
    <form action={action} className="grid max-w-3xl gap-5" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {state.saved && (
        <p
          role="status"
          className="rounded-field bg-accent-soft px-4 py-3 font-semibold"
        >
          Saved. The shop shows the change now.
        </p>
      )}
      {state.errors.form && (
        <p role="alert" className="text-err">
          {state.errors.form}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field {...f.name.label} label="Name">
          <input
            {...f.name.control}
            defaultValue={v.name}
            required
            className={FIELD}
          />
        </Field>
        <Field {...f.brand.label} label="Brand (optional)">
          <input
            {...f.brand.control}
            defaultValue={v.brand}
            className={FIELD}
          />
        </Field>
        <Field {...f.categoryId.label} label="Category">
          <select
            {...f.categoryId.control}
            defaultValue={v.categoryId}
            className={FIELD}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          {...f.status.label}
          label="Status"
          hint="Only active Products show in the shop."
        >
          <select
            {...f.status.control}
            defaultValue={v.status}
            className={FIELD}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </Field>
        <Field
          {...f.price.label}
          label="Price (₱)"
          hint="VAT included, such as 59.00"
        >
          <input
            {...f.price.control}
            inputMode="decimal"
            defaultValue={v.price}
            className={FIELD}
          />
        </Field>
        <Field
          {...f.compareAt.label}
          label="Compare-at price (₱, optional)"
          hint="Shown struck through as the old price"
        >
          <input
            {...f.compareAt.control}
            inputMode="decimal"
            defaultValue={v.compareAt}
            className={FIELD}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field {...f.packSizeValue.label} label="Pack size">
            <input
              {...f.packSizeValue.control}
              inputMode="numeric"
              defaultValue={v.packSizeValue}
              className={FIELD}
            />
          </Field>
          <Field {...f.packSizeUnit.label} label="Unit">
            <select
              {...f.packSizeUnit.control}
              defaultValue={v.packSizeUnit}
              className={FIELD}
            >
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="pc">pc</option>
            </select>
          </Field>
        </div>
        <Field
          {...f.taxClass.label}
          label="Tax class"
          hint="Confirm with the accountant before launch."
        >
          <select
            {...f.taxClass.control}
            defaultValue={v.taxClass}
            className={FIELD}
          >
            <option value="vatable">vatable</option>
            <option value="vat_exempt">vat_exempt</option>
            <option value="zero_rated">zero_rated</option>
          </select>
        </Field>
        <Field {...f.storage.label} label="Storage">
          <select
            {...f.storage.control}
            defaultValue={v.storage}
            className={FIELD}
          >
            <option value="ambient">ambient</option>
            <option value="chilled">chilled</option>
            <option value="frozen">frozen</option>
          </select>
        </Field>
        <Field {...f.barcode.label} label="Barcode (optional)">
          <input
            {...f.barcode.control}
            inputMode="numeric"
            defaultValue={v.barcode}
            className={FIELD}
          />
        </Field>
      </div>

      <label className="flex min-h-11 items-center gap-3 font-semibold">
        <input
          type="checkbox"
          name="isWeighed"
          defaultChecked={v.isWeighed}
          className="size-5 accent-[var(--ink)]"
        />
        Sold by weight (Weighed Product)
      </label>

      <Field {...f.description.label} label="Description (optional)">
        <textarea
          {...f.description.control}
          defaultValue={v.description}
          rows={4}
          className="rounded-field border-input bg-card w-full border px-3 py-2 text-base"
        />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          {...f.allergens.label}
          label="Allergens (optional)"
          hint="Separate with commas, such as milk, soy"
        >
          <input
            {...f.allergens.control}
            defaultValue={v.allergens}
            className={FIELD}
          />
        </Field>
        <Field
          {...f.dietaryTags.label}
          label="Dietary tags (optional)"
          hint="Lowercase, such as vegan, low-fat"
        >
          <input
            {...f.dietaryTags.control}
            defaultValue={v.dietaryTags}
            className={FIELD}
          />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving..."
            : values.id
              ? "Save changes"
              : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
