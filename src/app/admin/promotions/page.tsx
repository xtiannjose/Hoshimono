import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { listPromotionsForAdmin } from "@/modules/pricing";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import { offerStatus, TONE } from "./offer-status";

export const metadata: Metadata = { title: "Promotions" };

export default function PromotionsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/promotions" area="promotions">
        <Promotions />
      </StaffGate>
    </Suspense>
  );
}

/** Every Promotion, latest ending first (ADR 0015). */
async function Promotions() {
  await connection();
  const now = new Date();
  const promotions = await listPromotionsForAdmin();
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-h2">Promotions</h1>
        <Link href="/admin/promotions/new" className={buttonVariants()}>
          New Promotion
        </Link>
      </div>
      <p className="text-muted-foreground max-w-2xl">
        A Promotion is the shelf price while it runs: Customers see the sale
        price with the regular one struck through.
      </p>
      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Promotions, {promotions.length}</caption>
          <thead className="bg-muted">
            <tr>
              {["Promotion", "Off", "On", "Status"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-4 py-6">
                  No Promotions yet.
                </td>
              </tr>
            )}
            {promotions.map((p) => {
              const status = offerStatus(p, now);
              return (
                <tr
                  key={p.id}
                  className="border-border hover:bg-muted/60 border-t"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/promotions/${p.id}`}
                      className="font-semibold hover:underline"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {p.kind === "percent"
                      ? `${p.value}%`
                      : `${formatMoney(p.value)} each`}
                  </td>
                  <td className="text-muted-foreground px-4 py-2.5">
                    {[
                      p.categoryIds.length &&
                        `${p.categoryIds.length} ${p.categoryIds.length === 1 ? "Category" : "Categories"}`,
                      p.productIds.length &&
                        `${p.productIds.length} ${p.productIds.length === 1 ? "Product" : "Products"}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-pill px-2 py-0.5 text-xs font-bold ${TONE[status.tone]}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
