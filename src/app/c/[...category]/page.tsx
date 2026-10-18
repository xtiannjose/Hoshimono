import { FunnelSimpleIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { Suspense } from "react";

import {
  category,
  categoryPaths,
  categoryTree,
  productList,
  stockStates,
} from "@/app/_data/storefront";
import { Breadcrumb } from "@/components/breadcrumb";
import { Filters } from "@/components/listing/filters";
import { Pagination } from "@/components/listing/pagination";
import { SortSelect } from "@/components/listing/sort-select";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { categoryHref } from "@/lib/routes";

import { PAGE_SIZE, parseListParams, withParams } from "../list-params";

type Props = PageProps<"/c/[...category]">;

export async function generateStaticParams() {
  const paths = categoryPaths(await categoryTree());
  const params = [...paths.values()].map((path) => ({ category: path }));
  // Cache Components needs at least one param; an empty catalogue (a fresh
  // database in CI) gets a placeholder that renders as not found.
  return params.length > 0 ? params : [{ category: ["__placeholder__"] }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slugs } = await params;
  const found = await category(slugs.at(-1) ?? "");
  if (!found) return { title: "Category not found" };
  const path = [...found.ancestors.map((a) => a.slug), found.slug];
  return {
    title: found.name,
    description: `Shop ${found.name.toLowerCase()} for same-day delivery in Metro Manila.`,
    alternates: { canonical: categoryHref(path) },
  };
}

export default function CategoryPage({ params, searchParams }: Props) {
  return (
    <div className="wrap">
      <Suspense fallback={<ListingSkeleton />}>
        <CategoryListing params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CategoryListing({ params, searchParams }: Props) {
  const { category: slugs } = await params;
  const found = await category(slugs.at(-1) ?? "");
  if (!found) notFound();

  const query = await searchParams;
  // One canonical URL per Category: a stale or partial path redirects.
  const path = [...found.ancestors.map((a) => a.slug), found.slug];
  const href = categoryHref(path);
  if (path.join("/") !== slugs.join("/"))
    permanentRedirect(withParams(href, query, {}));

  const { filters, page, min, max } = parseListParams(query);
  const list = await productList({ ...filters, categorySlug: found.slug });
  if (!list) notFound();
  const stock = await stockStates(list.items.map((p) => p.id));
  const filtered =
    (filters.brands?.length ?? 0) + (filters.dietaryTags?.length ?? 0) > 0 ||
    min !== "" ||
    max !== "";

  const crumbs = [
    ...found.ancestors.map((a, i) => ({
      name: a.name,
      href: categoryHref(path.slice(0, i + 1)),
    })),
    { name: found.name, href },
  ];
  const sort = filters.sort ?? "featured";
  // Two copies (phone and desktop) need their own ids.
  const filterForm = (id: string) => (
    <Filters
      id={id}
      sort={sort}
      action={href}
      facets={list.facets}
      selected={{
        brands: filters.brands ?? [],
        dietaryTags: filters.dietaryTags ?? [],
        min,
        max,
      }}
      subCategories={found.children.map((node) => ({
        node,
        href: categoryHref([...path, node.slug]),
      }))}
    />
  );
  // Sorting keeps the filters; a new sort starts again at page 1.
  const keep = Object.entries(query).flatMap(([name, v]) =>
    name === "sort" || name === "page"
      ? []
      : (Array.isArray(v) ? v : v ? [v] : []).map(
          (one) => [name, one] as [string, string]
        )
  );
  // A page past the end (a stale link) goes to the last page instead.
  const pages = Math.ceil(list.total / PAGE_SIZE);
  if (page > pages && pages > 0) {
    redirect(withParams(href, query, { page: String(pages) }));
  }

  return (
    <>
      <Breadcrumb items={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-6 pt-1 pb-6">
        <div>
          <h1 className="type-h1">{found.name}</h1>
          <p className="text-muted-foreground mt-1">
            {list.total} {list.total === 1 ? "product" : "products"}
          </p>
        </div>
        <SortSelect action={href} value={sort} keep={keep} />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[248px_1fr]">
        {/* Phones: filters fold away; desktop: a sticky sidebar. */}
        <details className="rounded-card border-border bg-card border px-4 py-2 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
            <FunnelSimpleIcon size={20} aria-hidden />
            Filters
          </summary>
          <div className="pt-3 pb-2">{filterForm("filters-phone")}</div>
        </details>
        <aside
          aria-label="Filters"
          className="sticky top-[136px] hidden lg:block"
        >
          {filterForm("filters-wide")}
        </aside>

        <section aria-label="Products">
          <ProductGrid
            products={list.items}
            stock={stock}
            priorityCount={4}
            empty={
              filtered ? (
                <p>
                  No products match these filters.{" "}
                  <Link
                    href={href}
                    className="font-semibold underline underline-offset-4"
                  >
                    Clear filters
                  </Link>
                </p>
              ) : (
                <p>Nothing here yet. We are stocking this aisle soon.</p>
              )
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.total}
            href={(p) => withParams(href, query, { page: String(p) })}
          />
        </section>
      </div>
    </>
  );
}

function ListingSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading products"
      className="pt-5"
    >
      <div className="rounded-pill bg-muted h-5 w-48 animate-pulse" />
      <div className="rounded-pill bg-muted mt-6 mb-6 h-12 w-64 animate-pulse" />
      <ProductGridSkeleton count={8} />
    </div>
  );
}
