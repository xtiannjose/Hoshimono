"use client";

import Link from "@/components/link";
import { SearchForm } from "@/components/shell/search-form";
import { buttonVariants } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";

// A Client Component so the words follow the page's language here and under
// /admin, which reuses this page and has no language in its address.
export default function NotFound() {
  const t = useMessages().notFound;
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md gap-5">
        <h1 className="type-h2">{t.title}</h1>
        <p className="text-muted-foreground">{t.body}</p>
        <SearchForm id="q-not-found" />
        <div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            {t.home}
          </Link>
        </div>
      </div>
    </section>
  );
}
