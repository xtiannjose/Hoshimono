import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { formatDateTime } from "@/lib/dates";
import { isUuid } from "@/lib/uuid";
import { getDefaultHubId } from "@/modules/delivery";
import { listStockForAdmin, stockHistory } from "@/modules/inventory";

import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { StockForm } from "../forms";

export const metadata: Metadata = { title: "Stock" };

type Props = PageProps<"/admin/stock/[productId]">;

const WHY = {
  receipt: "Received",
  reserve: "Reserved for an Order",
  release: "Reservation released",
  pick: "Picked",
  shrink: "Shrink",
  adjustment: "Count",
  return: "Back from a cancelled Order",
} as const;

export default function ProductStockPage({ params }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/stock" area="stock">
        <ProductStock params={params} />
      </StaffGate>
    </Suspense>
  );
}

/** One Product's stock: change it, and see every movement (ADR 0012). */
async function ProductStock({ params }: { params: Props["params"] }) {
  const { productId } = await params;
  const hubId = await getDefaultHubId();
  if (!hubId || !isUuid(productId)) notFound();
  const row = (await listStockForAdmin(hubId)).find(
    (r) => r.productId === productId
  );
  if (!row) notFound();
  const history = await stockHistory(hubId, productId);
  return (
    <section className="grid max-w-4xl gap-6">
      <div className="grid gap-1">
        <Link
          href="/admin/stock"
          className="text-muted-foreground text-sm hover:underline"
        >
          All stock
        </Link>
        <h1 className="type-h2">{row.name}</h1>
        <p className="tabular-nums">
          <b>{row.onHand}</b> on the shelf, <b>{row.reserved}</b> reserved for
          Orders, <b>{row.free}</b> free
          {row.low && <span className="text-warn font-semibold">: low</span>}
        </p>
        {row.short > 0 && (
          <p className="text-err font-semibold">
            {row.short} more reserved than on the shelf: some Orders will come
            up short. Pickers mark them Short.
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StockForm productId={productId} move="receive" />
        <StockForm productId={productId} move="shrink" />
        <StockForm
          productId={productId}
          move="count"
          defaultValue={row.onHand}
        />
        <StockForm
          productId={productId}
          move="threshold"
          defaultValue={row.lowStockThreshold}
        />
      </div>
      <section aria-labelledby="h-history" className="grid gap-2">
        <h2 id="h-history" className="type-h3">
          Latest movements
        </h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-border grid divide-y text-sm">
            {history.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap justify-between gap-2 py-2"
              >
                <span>
                  <b>{WHY[m.reason]}</b>
                  {m.orderNo && <span className="font-mono"> {m.orderNo}</span>}
                  {m.note && <span>: {m.note}</span>}
                  {m.staffName && (
                    <span className="text-muted-foreground">
                      {" "}
                      by {m.staffName}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                  <span className="text-muted-foreground ml-3">
                    {formatDateTime(m.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
