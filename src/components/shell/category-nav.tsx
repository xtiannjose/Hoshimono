import { Suspense } from "react";

import { categoryTree } from "@/app/_data/storefront";
import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { categoryHref } from "@/lib/routes";

import { ActiveCategoryLinks, CategoryLinks } from "./category-links";

/** Top-level Categories: chips on phones, underlined tabs from md up. */
export async function CategoryNav({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].shell;
  const tree = await categoryTree();
  const links = [
    ...tree.map((c) => ({
      slug: c.slug,
      name: c.name,
      href: categoryHref([c.slug]),
    })),
    // Not a Category, but shopped the same way (ADR 0013).
    { slug: "recipes", name: t.recipes, href: "/recipes" },
  ];
  return (
    <nav
      aria-label={t.categories}
      className="wrap flex [scrollbar-width:none] gap-2 overflow-x-auto py-3 md:h-12 md:items-stretch md:gap-1 md:py-0"
    >
      {/* Unmarked until the path is read; the same links either way. */}
      <Suspense fallback={<CategoryLinks links={links} />}>
        <ActiveCategoryLinks links={links} />
      </Suspense>
    </nav>
  );
}
