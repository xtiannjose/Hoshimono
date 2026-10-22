"use client";

import { useMessages } from "@/i18n/client";
import type { ProductSort } from "@/modules/catalog";

const OPTIONS: ProductSort[] = [
  "featured",
  "price_asc",
  "price_desc",
  "unit_price_asc",
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
  const t = useMessages().listing;
  return (
    <form action={action} className="flex items-center gap-2">
      {keep.map(([name, v], i) => (
        <input key={`${name}-${i}`} type="hidden" name={name} value={v} />
      ))}
      <label htmlFor="sort" className="text-sm font-semibold">
        {t.sort}
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-pill border-input bg-card h-11 border px-4 pr-8 text-base"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {t.sorts[o]}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="rounded-pill border-input h-11 border px-4 font-semibold"
        >
          {t.sort}
        </button>
      </noscript>
    </form>
  );
}
