"use client";

import { useLocalPath, useShopPath } from "@/i18n/client";

export type CategoryLink = { slug: string; name: string; href: string };

const LINK =
  "rounded-pill border-input bg-card hover:bg-muted md:text-muted-foreground md:hover:text-foreground inline-flex min-h-11 shrink-0 items-center border px-4 text-label font-medium whitespace-nowrap md:min-h-0 md:rounded-none md:border-0 md:border-b-2 md:border-transparent md:bg-transparent md:px-3 md:hover:bg-transparent aria-[current=page]:border-ink aria-[current=page]:font-semibold md:aria-[current=page]:border-ink md:aria-[current=page]:text-foreground";

/** The links, the one under the current Category marked (mockup-v2 catnav). */
export function CategoryLinks({
  links,
  current = null,
}: {
  links: CategoryLink[];
  current?: string | null;
}) {
  const local = useLocalPath();
  return links.map((c) => (
    <a
      key={c.slug}
      href={local(c.href)}
      aria-current={c.slug === current ? "page" : undefined}
      className={LINK}
    >
      {c.name}
    </a>
  ));
}

/** Reads the path, so it renders inside Suspense (Next 16 cacheComponents). */
export function ActiveCategoryLinks({ links }: { links: CategoryLink[] }) {
  // /c/<top-level slug>/...: the top-level aisle is the one to mark.
  const [, section, slug] = useShopPath().split("/");
  const current =
    section === "c" ? slug : section === "recipes" ? "recipes" : null;
  return <CategoryLinks links={links} current={current} />;
}
