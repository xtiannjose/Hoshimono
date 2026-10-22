import { CookingPotIcon } from "@phosphor-icons/react/ssr";

import { categoryTree } from "@/app/_data/storefront";
import Link from "@/components/link";
import { CategoryIcon } from "@/components/product/category-icon";
import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { categoryHref } from "@/lib/routes";

const TILE =
  "rounded-card border-border bg-card hover:border-border-strong flex h-24 w-28 flex-col justify-between border p-3 text-sm leading-tight font-semibold transition-colors lg:w-full";

/**
 * Every top-level Category in one row (ADR 0018): it scrolls sideways on
 * phones and fits in one line from lg up. Recipes are shopped the same way.
 */
export async function CategoryRow({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].home;
  const tree = await categoryTree();
  return (
    <nav aria-label={t.categories} className="wrap pt-4">
      <ul className="-mx-4 flex snap-x scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:grid lg:grid-cols-10 lg:overflow-visible lg:px-0">
        {tree.map((c) => (
          <li key={c.slug} className="shrink-0 snap-start">
            <Link href={categoryHref([c.slug])} className={TILE}>
              <CategoryIcon
                slug={c.slug}
                size={26}
                className="text-muted-foreground"
              />
              {c.name}
            </Link>
          </li>
        ))}
        <li className="shrink-0 snap-start">
          <Link href="/recipes" className={TILE}>
            <CookingPotIcon
              size={26}
              aria-hidden
              className="text-muted-foreground"
            />
            {t.recipes}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
