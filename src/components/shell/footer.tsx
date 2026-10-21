import Link from "next/link";

import { BrandLogo } from "@/components/shell/brand-logo";
import { brand } from "@/config/brand";

export function Footer() {
  return (
    <footer className="bg-surface-2 mt-24 print:hidden">
      <div className="wrap flex flex-col gap-3 py-10">
        <BrandLogo className="text-[22px]" />
        <p className="type-small text-muted-foreground max-w-[44ch]">
          {brand.description}
        </p>
        <nav
          aria-label="More from Hoshimono"
          className="flex flex-wrap gap-x-6"
        >
          <Link
            href="/recipes"
            className="inline-flex min-h-11 items-center font-semibold hover:underline"
          >
            Recipes
          </Link>
          <Link
            href="/articles"
            className="inline-flex min-h-11 items-center font-semibold hover:underline"
          >
            Tips and guides
          </Link>
        </nav>
      </div>
    </footer>
  );
}
