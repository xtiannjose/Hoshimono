"use client";

import type { ProductSort } from "@/modules/catalog";

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "unit_price_asc", label: "Unit price, low to high" },
];

/** Part of the filter form (`form` attribute); applies on change when JS runs. */
export function SortSelect({
  form,
  value,
}: {
  form: string;
  value: ProductSort;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm font-semibold">
        Sort
      </label>
      <select
        id="sort"
        name="sort"
        form={form}
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-pill border-input bg-card h-10 border px-4 pr-8 text-[15px]"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
