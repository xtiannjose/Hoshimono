import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import {
  categoryTree,
  productSearch,
  stockStates,
} from "@/app/_data/storefront";
import { PAGE_SIZE, withParams } from "@/app/c/list-params";
import { Pagination } from "@/components/listing/pagination";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { categoryHref } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

type Props = PageProps<"/search">;

export default function SearchPage({ searchParams }: Props) {
  return (
    <div className="wrap pt-6">
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

async function Results({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const params = await searchParams;
  const query = one(params.q).trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);

  if (!query) {
    return (
      <Guidance title="What are you looking for?">
        Type a product, brand or Filipino name in the search box, such as gatas,
        Alaska or pandesal.
      </Guidance>
    );
  }

  const found = await productSearch(query, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  // A page past the end (a stale link) goes to the last page instead.
  const pages = Math.ceil(found.total / PAGE_SIZE);
  if (page > pages && pages > 0) {
    redirect(withParams("/search", params, { page: String(pages) }));
  }
  if (found.total === 0) {
    return (
      <Guidance title={`No results for "${query}"`}>
        Check the spelling, use fewer words, or try the English or Filipino name
        (milk or gatas). You can also browse an aisle:
      </Guidance>
    );
  }

  const stock = await stockStates(found.items.map((p) => p.id));
  return (
    <>
      <h1 className="type-h2">
        {found.correctedQuery
          ? `Results for "${found.correctedQuery}"`
          : `Results for "${query}"`}
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">
        {found.correctedQuery
          ? `We did not find "${query}", so we searched for "${found.correctedQuery}". `
          : ""}
        {found.total} {found.total === 1 ? "product" : "products"}
      </p>
      <ProductGrid
        products={found.items}
        stock={stock}
        priorityCount={4}
        empty={null}
      />
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={found.total}
        href={(p) => withParams("/search", params, { page: String(p) })}
      />
    </>
  );
}

async function Guidance({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const tree = await categoryTree();
  return (
    <section className="grid max-w-2xl gap-4 py-6">
      <h1 className="type-h2">{title}</h1>
      <p className="text-muted-foreground">{children}</p>
      <ul className="flex flex-wrap gap-2">
        {tree.map((c) => (
          <li key={c.slug}>
            <Link
              href={categoryHref([c.slug])}
              className="rounded-pill border-input bg-card hover:bg-muted inline-flex min-h-11 items-center border px-4 text-[15px] font-medium"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
