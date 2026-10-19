import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** "Showing 25 to 48 of 120" with Previous and Next links. */
export function Pagination({
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
  if (total === 0) return null;
  const last = Math.min(total, page * pageSize);
  const first = Math.min((page - 1) * pageSize + 1, last);
  const pages = Math.ceil(total / pageSize);
  return (
    <nav
      aria-label="Pages"
      className="flex flex-col items-center gap-3 pt-8 pb-2"
    >
      <p className="text-muted-foreground">
        Showing {first} to {last} of {total}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={href(page - 1)}
              rel="prev"
              className={buttonVariants({ variant: "secondary" })}
            >
              Previous
            </Link>
          )}
          {page < pages && (
            <Link
              href={href(page + 1)}
              rel="next"
              className={buttonVariants({ variant: "secondary" })}
            >
              Next
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
