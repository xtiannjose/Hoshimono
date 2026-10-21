"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { CATALOG_TAG } from "@/app/_data/storefront";
import { fromManilaInput } from "@/lib/dates";
import { parseMoney } from "@/lib/money";
import { requireStaff } from "@/modules/identity";
import {
  deletePromotion,
  savePromotion,
  saveVoucher,
  type PromotionInput,
  type VoucherInput,
} from "@/modules/pricing";

import { adminWrite } from "../admin-write";

// Promotions and Vouchers (ADR 0015): Merchandisers and Admins. Every save
// is audited; Promotions change shelf prices, so the catalogue refreshes.

export type OfferFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const pesos = (fd: FormData, key: string) =>
  parseMoney(text(fd, key)) ?? Number.NaN;
const optionalPesos = (fd: FormData, key: string) =>
  text(fd, key) ? pesos(fd, key) : null;
const whole = (fd: FormData, key: string) =>
  text(fd, key) === "" ? Number.NaN : Number(text(fd, key));

export async function savePromotionAction(
  id: string | null,
  _prev: OfferFormState,
  fd: FormData
): Promise<OfferFormState> {
  const staff = await requireStaff("promotions", "/admin/promotions");
  const kind = text(fd, "kind") === "amount" ? "amount" : "percent";
  const input: PromotionInput = {
    name: text(fd, "name"),
    kind,
    value: kind === "percent" ? whole(fd, "value") : pesos(fd, "value"),
    productIds: fd.getAll("productIds").map(String),
    categoryIds: fd.getAll("categoryIds").map(String),
    startsAt: fromManilaInput(text(fd, "startsAt")),
    endsAt: fromManilaInput(text(fd, "endsAt")),
    isActive: fd.get("isActive") === "on",
  };
  const result = await adminWrite(
    staff.id,
    (tx) => savePromotion(input, id ?? undefined, tx),
    (done) => [
      {
        action: id ? "update" : "create",
        entity: "promotion",
        entityId: done.id,
        after: input,
      },
    ]
  );
  if (!result.ok) return { errors: result.errors };
  updateTag(CATALOG_TAG);
  if (!id) redirect(`/admin/promotions/${result.id}?created=1`);
  return { errors: {}, saved: true };
}

export async function deletePromotionAction(id: string): Promise<void> {
  const staff = await requireStaff("promotions", "/admin/promotions");
  const result = await adminWrite(
    staff.id,
    async (tx) => ({ ok: await deletePromotion(id, tx) }),
    () => [{ action: "delete", entity: "promotion", entityId: id }]
  );
  if (result.ok) updateTag(CATALOG_TAG);
  redirect("/admin/promotions");
}

export async function saveVoucherAction(
  id: string | null,
  _prev: OfferFormState,
  fd: FormData
): Promise<OfferFormState> {
  const staff = await requireStaff("promotions", "/admin/vouchers");
  const kindText = text(fd, "kind");
  const kind =
    kindText === "amount" || kindText === "free_delivery"
      ? kindText
      : "percent";
  const input: VoucherInput = {
    code: text(fd, "code"),
    kind,
    value:
      kind === "percent"
        ? whole(fd, "value")
        : kind === "amount"
          ? pesos(fd, "value")
          : 0,
    maxDiscountCents: optionalPesos(fd, "maxDiscount"),
    minSpendCents: text(fd, "minSpend") ? pesos(fd, "minSpend") : 0,
    startsAt: fromManilaInput(text(fd, "startsAt")),
    endsAt: fromManilaInput(text(fd, "endsAt")),
    usageLimit: text(fd, "usageLimit") ? whole(fd, "usageLimit") : null,
    perCustomerLimit: whole(fd, "perCustomerLimit"),
    firstOrderOnly: fd.get("firstOrderOnly") === "on",
    isActive: fd.get("isActive") === "on",
  };
  const result = await adminWrite(
    staff.id,
    (tx) => saveVoucher(input, id ?? undefined, tx),
    (done) => [
      {
        action: id ? "update" : "create",
        entity: "voucher",
        entityId: done.id,
        after: input,
      },
    ]
  );
  if (!result.ok) return { errors: result.errors };
  if (!id) redirect(`/admin/vouchers/${result.id}?created=1`);
  return { errors: {}, saved: true };
}
