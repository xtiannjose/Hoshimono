import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { toManilaInput } from "@/lib/dates";
import { getPromotionForAdmin } from "@/modules/pricing";

import { productChoices } from "../../content/choices";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { deletePromotionAction } from "../actions";
import { categoryChoices } from "../choices";
import { PromotionForm } from "../promotion-form";

export const metadata: Metadata = { title: "Edit Promotion" };

type Props = PageProps<"/admin/promotions/[id]">;

export default function EditPromotionPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/promotions" area="promotions">
        <EditPromotion params={params} searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

async function EditPromotion({ params, searchParams }: Props) {
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const [promotion, products, categories] = await Promise.all([
    getPromotionForAdmin(id),
    productChoices(),
    categoryChoices(),
  ]);
  if (!promotion) notFound();
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/promotions"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Promotions
        </Link>
        <h1 className="type-h2">{promotion.name}</h1>
        {created && (
          <p role="status" className="font-semibold">
            Promotion created.
          </p>
        )}
      </div>
      <PromotionForm
        id={promotion.id}
        products={products}
        categories={categories}
        values={{
          name: promotion.name,
          kind: promotion.kind,
          value:
            promotion.kind === "percent"
              ? String(promotion.value)
              : (promotion.value / 100).toFixed(2),
          productIds: promotion.productIds,
          categoryIds: promotion.categoryIds,
          startsAt: toManilaInput(promotion.startsAt),
          endsAt: toManilaInput(promotion.endsAt),
          isActive: promotion.isActive,
        }}
      />
      <form action={deletePromotionAction.bind(null, promotion.id)}>
        <Button type="submit" variant="ghost" className="text-err">
          Delete Promotion
        </Button>
      </form>
    </section>
  );
}
