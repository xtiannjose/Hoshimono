import Link from "@/components/link";

import { buttonVariants } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";

/** "Showing 25 to 48 of 120" with Previous and Next links, past one page. */
export async function Pagination({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  // One page holds everything: nothing to count or page through.
  if (total <= pageSize) return null;
  const t = (await getMessages()).listing;
  const last = Math.min(total, page * pageSize);
  const first = Math.min((page - 1) * pageSize + 1, last);
  const pages = Math.ceil(total / pageSize);
  return (
    <nav
      aria-label={t.pages}
      className="flex flex-col items-center gap-3 pt-8 pb-2"
    >
      <p className="text-muted-foreground">{t.showing(first, last, total)}</p>
      {
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={href(page - 1)}
              rel="prev"
              className={buttonVariants({ variant: "secondary" })}
            >
              {t.previous}
            </Link>
          )}
          {page < pages && (
            <Link
              href={href(page + 1)}
              rel="next"
              className={buttonVariants({ variant: "secondary" })}
            >
              {t.next}
            </Link>
          )}
        </div>
      }
    </nav>
  );
}
