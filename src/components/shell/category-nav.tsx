import { categoryTree } from "@/app/_data/storefront";
import { categoryHref } from "@/lib/routes";

/** Top-level Categories: chips on phones, underlined tabs from md up. */
export async function CategoryNav() {
  const tree = await categoryTree();
  return (
    <nav
      aria-label="Categories"
      className="wrap flex [scrollbar-width:none] gap-2 overflow-x-auto py-3 md:h-12 md:items-stretch md:gap-1 md:py-0"
    >
      {tree.map((c) => (
        <a
          key={c.slug}
          href={categoryHref([c.slug])}
          className="rounded-pill border-input bg-card hover:bg-muted md:text-muted-foreground md:hover:text-foreground inline-flex min-h-10 shrink-0 items-center border px-4 text-[15px] font-medium whitespace-nowrap md:min-h-0 md:rounded-none md:border-0 md:border-b-2 md:border-transparent md:bg-transparent md:px-3 md:hover:bg-transparent"
        >
          {c.name}
        </a>
      ))}
    </nav>
  );
}
