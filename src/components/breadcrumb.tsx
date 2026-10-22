import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "@/components/link";
import { getMessages } from "@/i18n/server";

export type Crumb = { name: string; href: string };

/** Home, then each step; the last item is the current page. */
export async function Breadcrumb({ items }: { items: Crumb[] }) {
  const t = (await getMessages()).breadcrumb;
  const all = [{ name: t.home, href: "/" }, ...items];
  return (
    <nav aria-label={t.label} className="pt-3 pb-1 md:pt-5 md:pb-2">
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
