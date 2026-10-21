import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

import {
  categoryPaths,
  categoryTree,
  productList,
} from "@/app/_data/storefront";
import { CategoryIcon } from "@/components/product/category-icon";
import { HOME_MOSAIC } from "@/config/home";
import type { CategoryNode } from "@/modules/catalog";
import { categoryHref } from "@/lib/routes";
import { Skeleton } from "@/components/ui/skeleton";

function find(tree: CategoryNode[], slug: string): CategoryNode | undefined {
  for (const node of tree) {
    if (node.slug === slug) return node;
    const child = find(node.children, slug);
    if (child) return child;
  }
}

/** "Avocado, Calamansi and 7 more", from the Category's real Products. */
async function sampleLine(slug: string): Promise<string | null> {
  const list = await productList({ categorySlug: slug, limit: 2 });
  if (!list || list.total === 0) return null;
  const names = list.items.map((p) => p.name).join(", ");
  const more = list.total - list.items.length;
  return more > 0 ? `${names} and ${more} more` : names;
}

const NAME =
  "flex items-center gap-1.5 font-display text-[22px] leading-[26px] font-semibold tracking-[-0.02em]";

/**
 * Eight Categories, no empty cell: one big (2 x 2), one wide (2 x 1) and
 * six small tiles on a 4-column grid; 2 columns below 768 px.
 */
export async function CategoryMosaic() {
  const tree = await categoryTree();
  const paths = categoryPaths(tree);
  const tiles = [HOME_MOSAIC.big, HOME_MOSAIC.wide, ...HOME_MOSAIC.small]
    .map((slug) => find(tree, slug))
    .filter((c): c is CategoryNode => c !== undefined);
  const [big, wide, ...small] = tiles;
  const [bigLine, wideLine] = await Promise.all([
    big ? sampleLine(big.slug) : null,
    wide ? sampleLine(wide.slug) : null,
  ]);
  const href = (c: CategoryNode) => categoryHref(paths.get(c.slug) ?? [c.slug]);

  return (
    <ul className="grid auto-rows-[136px] grid-cols-2 gap-3 md:auto-rows-[168px] md:grid-cols-4 md:gap-4">
      {big && (
        <li className="col-span-2 md:row-span-2">
          <Link
            href={href(big)}
            className="rounded-card bg-accent-soft relative flex h-full flex-col overflow-hidden px-5 py-[18px]"
          >
            <span className={NAME}>
              {big.name} <ArrowRightIcon size={18} aria-hidden />
            </span>
            {bigLine && (
              <p className="text-muted-foreground mt-1.5 max-w-[30ch] text-sm leading-5">
                {bigLine}
              </p>
            )}
            <span
              aria-hidden
              className="rounded-field photo-slot absolute inset-x-5 bottom-5 hidden h-[58%] md:grid"
            >
              <CategoryIcon slug={big.slug} size={48} className="opacity-70" />
            </span>
          </Link>
        </li>
      )}
      {wide && (
        <li className="col-span-2">
          <Link
            href={href(wide)}
            className="rounded-card bg-muted relative flex h-full overflow-hidden px-5 py-[18px]"
          >
            <div className="max-w-[48%]">
              <span className={NAME}>
                {wide.name} <ArrowRightIcon size={18} aria-hidden />
              </span>
              {wideLine && (
                <p className="text-muted-foreground mt-1.5 text-sm leading-5">
                  {wideLine}
                </p>
              )}
            </div>
            <span
              aria-hidden
              className="rounded-field bg-card photo-slot absolute inset-y-3 right-3 w-[46%]"
            >
              <CategoryIcon slug={wide.slug} size={40} className="opacity-70" />
            </span>
          </Link>
        </li>
      )}
      {small.map((c) => (
        <li key={c.slug}>
          <Link
            href={href(c)}
            className="rounded-card border-border bg-card hover:border-border-strong relative flex h-full flex-col justify-between overflow-hidden border px-5 py-[18px] transition-colors"
          >
            <span
              className={`${NAME} text-lg leading-6 md:text-[22px] md:leading-[26px]`}
            >
              {c.name}
            </span>
            <CategoryIcon
              slug={c.slug}
              size={48}
              className="text-muted-foreground absolute right-4 bottom-3 opacity-55"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryMosaicSkeleton() {
  return (
    <div
      aria-hidden
      className="grid auto-rows-[136px] grid-cols-2 gap-3 md:auto-rows-[168px] md:grid-cols-4 md:gap-4"
    >
      <Skeleton className="rounded-card col-span-2 md:row-span-2" />
      <Skeleton className="rounded-card col-span-2" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="rounded-card" />
      ))}
    </div>
  );
}
