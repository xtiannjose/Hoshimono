"use client";

import type { ProductSort } from "@/modules/catalog";

const OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price, low to high" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "unit_price_asc", label: "Unit price, low to high" },
];

/**
 * Its own small GET form carrying the current filters, so sorting keeps
 * them; it applies on change when JS runs, with a button otherwise.
 */
export function SortSelect({
  action,
  value,
  keep,
}: {
  action: string;
  value: ProductSort;
  /** Current filter parameters to carry over (not sort or page). */
  keep: [string, string][];
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      {keep.map(([name, v], i) => (
        <input key={`${name}-${i}`} type="hidden" name={name} value={v} />
      ))}
      <label htmlFor="sort" className="text-sm font-semibold">
        Sort
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-pill border-input bg-card h-11 border px-4 pr-8 text-base"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="rounded-pill border-input h-11 border px-4 font-semibold"
        >
          Sort
        </button>
      </noscript>
    </form>
  );
}
