import { db, type Client } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

import type { PromotionRule } from "./promotion-price";

// Promotions (ADR 0015): staff set them; while one runs it is the shelf price.

export type PromotionInput = {
  name: string;
  kind: "percent" | "amount";
  /** Percent off (1 to 90), or centavos off each unit. */
  value: number;
  productIds: string[];
  categoryIds: string[];
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};

type SaveResult =
  { ok: true; id: string } | { ok: false; errors: Record<string, string> };

/** Promotions running at `now`, for promotedPrice. */
export async function activePromotions(
  now = new Date(),
  client: Client = db
): Promise<PromotionRule[]> {
  return client.promotion.findMany({
    where: { isActive: true, startsAt: { lte: now }, endsAt: { gt: now } },
    select: {
      id: true,
      name: true,
      kind: true,
      value: true,
      productIds: true,
      categoryIds: true,
    },
  });
}

export async function listPromotionsForAdmin() {
  return db.promotion.findMany({
    orderBy: [{ endsAt: "desc" }, { name: "asc" }],
  });
}

export async function getPromotionForAdmin(id: string) {
  return isUuid(id) ? db.promotion.findUnique({ where: { id } }) : null;
}

function check(input: PromotionInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = "Give the Promotion a name.";
  else if (input.name.trim().length > 80)
    errors.name = "Keep the name under 80 characters.";
  if (
    input.kind === "percent"
      ? !Number.isInteger(input.value) || input.value < 1 || input.value > 90
      : !Number.isInteger(input.value) || input.value < 1
  )
    errors.value =
      input.kind === "percent"
        ? "Take off 1 to 90 percent."
        : "Enter how much off, such as 20.00.";
  if (input.productIds.length + input.categoryIds.length === 0)
    errors.targets = "Choose at least one Product or Category.";
  if ([...input.productIds, ...input.categoryIds].some((id) => !isUuid(id)))
    errors.targets = "One of the choices no longer exists.";
  if (Number.isNaN(input.startsAt.getTime()))
    errors.startsAt = "Choose when it starts.";
  if (Number.isNaN(input.endsAt.getTime()))
    errors.endsAt = "Choose when it ends.";
  else if (input.endsAt <= input.startsAt)
    errors.endsAt = "End it after it starts.";
  return errors;
}

/** Create (no `id`) or update a Promotion (a form result, ADR 0009). */
export async function savePromotion(
  input: PromotionInput,
  id?: string,
  client: Client = db
): Promise<SaveResult> {
  const errors = check(input);
  if (Object.keys(errors).length) return { ok: false, errors };
  const data = {
    ...input,
    name: input.name.trim(),
    productIds: [...new Set(input.productIds)],
    categoryIds: [...new Set(input.categoryIds)],
  };
  if (id) {
    const { count } = await client.promotion.updateMany({
      where: { id },
      data,
    });
    return count
      ? { ok: true, id }
      : { ok: false, errors: { form: "That Promotion no longer exists." } };
  }
  const created = await client.promotion.create({ data, select: { id: true } });
  return { ok: true, id: created.id };
}

export async function deletePromotion(
  id: string,
  client: Client = db
): Promise<boolean> {
  if (!isUuid(id)) return false;
  return (await client.promotion.deleteMany({ where: { id } })).count > 0;
}
