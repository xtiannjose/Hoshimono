import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";

export type Crumb = { name: string; href: string };

/** Home, then each step; the last item is the current page. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const all = [{ name: "Home", href: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="pt-5 pb-2">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page">{c.name}</span>
              ) : (
                <>
                  <Link
                    href={c.href}
                    className="hover:text-foreground inline-flex min-h-8 items-center hover:underline"
                  >
                    {c.name}
                  </Link>
                  <CaretRightIcon size={14} aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
