import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { CategoryNode, ProductFacets } from "@/modules/catalog";

type Props = {
  id: string;
  action: string;
  /** The chosen sort, kept when filters apply. */
  sort: string;
  facets: ProductFacets;
  selected: {
    brands: string[];
    dietaryTags: string[];
    min: string;
    max: string;
  };
  subCategories: { node: CategoryNode; href: string }[];
};

const tagLabel = (tag: string) =>
  tag.charAt(0).toUpperCase() + tag.slice(1).replaceAll("-", " ");

const GROUP = "grid gap-1";
const HEADING = "mb-1.5 text-sm font-bold";
const OPTION = "flex min-h-11 cursor-pointer items-center gap-3";
const BOX = "size-5 accent-[var(--ink)]";

/** A plain GET form, so filters work without JavaScript (PRD CAT-2). */
export function Filters({
  id,
  action,
  sort,
  facets,
  selected,
  subCategories,
}: Props) {
  return (
    <form id={id} action={action} className="grid gap-6">
      {sort !== "featured" && <input type="hidden" name="sort" value={sort} />}
      {subCategories.length > 0 && (
        <div className={GROUP}>
          <h2 className={HEADING}>Categories</h2>
          {subCategories.map(({ node, href }) => (
            <Link
              key={node.slug}
              href={href}
              className="flex min-h-11 items-center hover:underline"
            >
              {node.name}
            </Link>
          ))}
        </div>
      )}
      {facets.dietaryTags.length > 0 && (
        <fieldset className={GROUP}>
          <legend className={HEADING}>Dietary</legend>
          {facets.dietaryTags.map((t) => (
            <label key={t.tag} className={OPTION}>
              <input
                type="checkbox"
                name="diet"
                value={t.tag}
                defaultChecked={selected.dietaryTags.includes(t.tag)}
                className={BOX}
              />
              {tagLabel(t.tag)}
              <span className="text-muted-foreground">({t.count})</span>
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className={GROUP}>
        <legend className={HEADING}>Price</legend>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="grid gap-1 text-sm">
            Min ₱
            <input
              name="min"
              inputMode="decimal"
              defaultValue={selected.min}
              placeholder={
                facets.priceCents
                  ? String(Math.floor(facets.priceCents.min / 100))
                  : ""
              }
              className="rounded-field border-input bg-card h-11 w-full border px-3 text-base"
            />
          </label>
          <span className="text-muted-foreground pb-3">to</span>
          <label className="grid gap-1 text-sm">
            Max ₱
            <input
              name="max"
              inputMode="decimal"
              defaultValue={selected.max}
              placeholder={
                facets.priceCents
                  ? String(Math.ceil(facets.priceCents.max / 100))
                  : ""
              }
              className="rounded-field border-input bg-card h-11 w-full border px-3 text-base"
            />
          </label>
        </div>
      </fieldset>
      {facets.brands.length > 0 && (
        <fieldset className={GROUP}>
          <legend className={HEADING}>Brand</legend>
          {facets.brands.map((b) => (
            <label key={b.name} className={OPTION}>
              <input
                type="checkbox"
                name="brand"
                value={b.name}
                defaultChecked={selected.brands.includes(b.name)}
                className={BOX}
              />
              {b.name}
              <span className="text-muted-foreground">({b.count})</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Apply filters</Button>
        <Link
          href={action}
          className="inline-flex min-h-12 items-center px-3 font-semibold underline underline-offset-4"
        >
          Clear filters
        </Link>
      </div>
    </form>
  );
}
