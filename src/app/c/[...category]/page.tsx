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
import type { CategoryDetail } from "@/modules/catalog";
import { categoryHref } from "@/lib/routes";

import { PAGE_SIZE, parseListParams, withParams } from "../list-params";

type Props = PageProps<"/c/[...category]">;

// The shell reads params (see the Product page): a Category added after the
// build renders on its first visit, and catalog updates regenerate cleanly.
export const instant = false;

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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slugs } = await params;
  const found = await category(slugs.at(-1) ?? "");
  // One canonical URL per Category: a stale or partial path redirects.
  const path = found ? [...found.ancestors.map((a) => a.slug), found.slug] : [];
  if (!found || path.join("/") !== slugs.join("/"))
    return (
      <div className="wrap">
        <Suspense fallback={null}>
          <NotHere
            href={found && categoryHref(path)}
            searchParams={searchParams}
          />
        </Suspense>
      </div>
    );

  const href = categoryHref(path);
  const crumbs = [
    ...found.ancestors.map((a, i) => ({
      name: a.name,
      href: categoryHref(path.slice(0, i + 1)),
    })),
    { name: found.name, href },
  ];
  // The heading renders in the page shell, so it paints first (LCP). The
  // count, sort and listing depend on the query and stream in together,
  // filling the grid cells around it.
  const listing = loadListing(found.slug, href, searchParams);

  return (
    <div className="wrap">
      <Breadcrumb items={crumbs} />
      {/* Phones: heading, count, then sort on its own row (it never fits
          beside a title). From sm up: sort beside heading and count. */}
      <div className="grid items-end gap-x-6 pt-1 sm:grid-cols-[1fr_auto]">
        <h1 className="type-h1 sm:col-start-1 sm:row-start-1">{found.name}</h1>
        <Suspense fallback={<ListingFallback />}>
          <CategoryListing
            listing={listing}
            found={found}
            path={path}
            href={href}
          />
        </Suspense>
      </div>
    </div>
  );
}

// Grid cells shared by the streamed listing and its fallback.
const COUNT_CELL = "text-muted-foreground mt-1 sm:col-start-1 sm:row-start-2";
const SORT_CELL =
  "mt-6 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:self-end";
const LIST_CELL = "pt-6 sm:col-span-2";

// shortcut: inside Suspense, so a missing Category streams a noindex
// not-found page with status 200 (see the Product page).
async function NotHere({
  href,
  searchParams,
}: {
  href: string | null;
  searchParams: Props["searchParams"];
}): Promise<never> {
  if (!href) notFound();
  permanentRedirect(withParams(href, await searchParams, {}));
}

type Listing = Awaited<ReturnType<typeof loadListing>>;

async function loadListing(
  slug: string,
  href: string,
  searchParams: Props["searchParams"]
) {
  const query = await searchParams;
  const { filters, page, min, max } = parseListParams(query);
  const list = await productList({ ...filters, categorySlug: slug });
  if (!list) notFound();
  // A page past the end (a stale link) goes to the last page instead.
  const pages = Math.ceil(list.total / PAGE_SIZE);
  if (page > pages && pages > 0) {
    redirect(withParams(href, query, { page: String(pages) }));
  }
  const stock = await stockStates(list.items.map((p) => p.id));
  const sort = filters.sort ?? "featured";
  return { query, filters, page, min, max, list, stock, sort };
}

async function CategoryListing({
  listing,
  found,
  path,
  href,
}: {
  listing: Promise<Listing>;
  found: CategoryDetail;
  path: string[];
  href: string;
}) {
  const { query, filters, page, min, max, list, stock, sort } = await listing;
  // Sorting keeps the filters; a new sort starts again at page 1.
  const keep = Object.entries(query).flatMap(([name, v]) =>
    name === "sort" || name === "page"
      ? []
      : (Array.isArray(v) ? v : v ? [v] : []).map(
          (one) => [name, one] as [string, string]
        )
  );
  const filtered =
    (filters.brands?.length ?? 0) + (filters.dietaryTags?.length ?? 0) > 0 ||
    min !== "" ||
    max !== "";
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
  return (
    <>
      <p className={COUNT_CELL}>
        {list.total} {list.total === 1 ? "product" : "products"}
      </p>
      <div className={SORT_CELL}>
        <SortSelect action={href} value={sort} keep={keep} />
      </div>
      <div
        className={`${LIST_CELL} grid items-start gap-8 lg:grid-cols-[248px_1fr]`}
      >
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

function ListingFallback() {
  return (
    <>
      <p className={COUNT_CELL}>&nbsp;</p>
      <div className={`${SORT_CELL} h-11`} />
      <div className={LIST_CELL}>
        <ProductGridSkeleton count={8} />
      </div>
    </>
  );
}
