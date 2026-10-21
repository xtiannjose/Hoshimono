import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { addDays, toManilaInput } from "@/lib/dates";

import { productChoices } from "../../content/choices";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { categoryChoices } from "../choices";
import { PromotionForm } from "../promotion-form";

export const metadata: Metadata = { title: "New Promotion" };

export default function NewPromotionPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/promotions/new" area="promotions">
        <NewPromotion />
      </StaffGate>
    </Suspense>
  );
}

async function NewPromotion() {
  await connection();
  const now = new Date();
  const [products, categories] = await Promise.all([
    productChoices(),
    categoryChoices(),
  ]);
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/promotions"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Promotions
        </Link>
        <h1 className="type-h2">New Promotion</h1>
      </div>
      <PromotionForm
        id={null}
        products={products}
        categories={categories}
        values={{
          name: "",
          kind: "percent",
          value: "10",
          productIds: [],
          categoryIds: [],
          startsAt: toManilaInput(now),
          endsAt: toManilaInput(addDays(now, 7)),
          isActive: true,
        }}
      />
    </section>
  );
}
