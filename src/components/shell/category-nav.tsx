import { categoryTree } from "@/app/_data/storefront";
import { categoryHref } from "@/lib/routes";

/** Top-level Categories: underlined tabs on desktop, chips on phones. */
export async function CategoryNav({ variant }: { variant: "tabs" | "chips" }) {
  const tree = await categoryTree();
  if (variant === "chips") {
    return (
      <nav
        aria-label="Categories"
        className="wrap flex [scrollbar-width:none] gap-2 overflow-x-auto py-3"
      >
        {tree.map((c) => (
          <a
            key={c.slug}
            href={categoryHref([c.slug])}
            className="rounded-pill border-input bg-card hover:bg-muted inline-flex min-h-10 shrink-0 items-center border px-4 text-[15px] font-medium whitespace-nowrap"
          >
            {c.name}
          </a>
        ))}
      </nav>
    );
  }
  return (
    <nav
      aria-label="Categories"
      className="wrap flex h-12 [scrollbar-width:none] items-stretch gap-1 overflow-x-auto"
    >
      {tree.map((c) => (
        <a
          key={c.slug}
          href={categoryHref([c.slug])}
          className="text-muted-foreground hover:text-foreground inline-flex items-center border-b-2 border-transparent px-3 text-[15px] font-medium whitespace-nowrap"
        >
          {c.name}
        </a>
      ))}
    </nav>
  );
}
