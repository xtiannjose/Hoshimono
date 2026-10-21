import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { getDefaultHubId } from "@/modules/delivery";
import { listStockForAdmin } from "@/modules/inventory";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Stock" };

type Props = PageProps<"/admin/stock">;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export default function StockPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/stock" area="stock">
        <Stock searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

/** The Hub's stock, low first when asked (ADR 0012). */
async function Stock({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const params = await searchParams;
  const q = one(params.q);
  const low = one(params.low) === "1";
  const hubId = await getDefaultHubId();
  const rows = hubId ? await listStockForAdmin(hubId, { q, low }) : [];
  return (
    <section className="grid gap-4">
      <h1 className="type-h2">Stock</h1>
      <form className="flex flex-wrap items-end gap-3" action="/admin/stock">
        <label className="grid gap-1 text-sm font-semibold">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Product or brand"
            className="rounded-field border-input bg-card h-11 w-72 border px-3 text-base font-normal"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="low"
            value="1"
            defaultChecked={low}
            className="accent-ink size-5"
          />
          Only what is low
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
          <caption className="sr-only">
            Stock at the Hub, {rows.length} Products
          </caption>
          <thead className="bg-muted sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Product
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                On the shelf
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Reserved
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Free
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Low at
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-6">
                  {low ? "Nothing is low. Good." : "No Products match."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.productId}
                className="border-border hover:bg-muted/60 border-t"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/stock/${r.productId}`}
                    className="font-semibold hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.low && (
                    <span className="bg-warn-soft text-warn rounded-pill ml-2 px-2 py-0.5 text-xs font-bold">
                      Low
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {r.onHand}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {r.reserved}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                  {r.free}
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                  {r.lowStockThreshold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
