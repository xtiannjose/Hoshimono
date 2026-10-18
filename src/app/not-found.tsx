import Link from "next/link";

import { SearchForm } from "@/components/shell/search-form";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md gap-5">
        <h1 className="type-h2">We could not find that page</h1>
        <p className="text-muted-foreground">
          The link may be old, or the item is no longer sold. Try a search
          instead.
        </p>
        <SearchForm id="q-not-found" />
        <div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
