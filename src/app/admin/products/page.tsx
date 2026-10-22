import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { withParams } from "@/app/[lang]/c/list-params";
import { Pagination } from "@/components/listing/pagination";
import { buttonVariants } from "@/components/ui/button";
import { listProductsForAdmin } from "@/modules/catalog";
import { formatMoney } from "@/lib/money";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Products" };

type Props = PageProps<"/admin/products">;
const PAGE_SIZE = 50;
const STATUSES = ["active", "draft", "archived"] as const;
const SORTS = {
  name: "Name",
  price: "Price",
  updated: "Last changed",
} as const;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default function AdminProducts({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/products">
        <ProductsTable searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

const STATUS_STYLE = {
  active: "bg-accent-soft text-foreground",
  draft: "bg-warn-soft text-warn",
  archived: "bg-muted text-muted-foreground",
};

async function ProductsTable({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const params = await searchParams;
  const q = one(params.q);
  const status = (STATUSES as readonly string[]).includes(one(params.status))
    ? (one(params.status) as (typeof STATUSES)[number])
    : undefined;
  const sort = (
    one(params.sort) in SORTS ? one(params.sort) : "name"
  ) as keyof typeof SORTS;
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const { rows, total } = await listProductsForAdmin({
    q,
    status,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="type-h2">Products</h1>
        <Link href="/admin/products/new" className={buttonVariants()}>
          New Product
        </Link>
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/admin/products">
        <label className="grid gap-1 text-sm font-semibold">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, brand, slug or barcode"
            className="rounded-field border-input bg-card h-11 w-72 border px-3 text-base font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Status
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-field border-input bg-card h-11 border px-3 text-base font-normal"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Sort
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-field border-input bg-card h-11 border px-3 text-base font-normal"
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary" })}
        >
          Show
        </button>
      </form>

      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Products, {total} in total</caption>
          <thead className="bg-muted sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Product
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Price
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Last changed
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-border hover:bg-muted/60 border-t"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/products/${r.id}`}
                    className="font-semibold hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.brand && (
                    <span className="text-muted-foreground block">
                      {r.brand}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">{r.categoryName}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {formatMoney(r.priceCents)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-pill px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                  {r.updatedAt.toLocaleDateString("en-PH", {
                    timeZone: "Asia/Manila",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  No Products match. Clear the search or import a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        href={(p) => withParams("/admin/products", params, { page: String(p) })}
      />
    </section>
  );
}
