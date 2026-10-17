import type { Prisma } from "@/generated/prisma/client";
import type {
  PackSizeUnit,
  Storage,
  TaxClass,
  UnitPriceBasis,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { prorate } from "@/lib/money";

import { getCategory } from "./categories";

export type UnitPrice = { cents: number; basis: UnitPriceBasis };
export type ProductImageView = { url: string; alt: string };

/** What a Product card needs. */
export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  packSize: { value: number; unit: PackSizeUnit };
  priceCents: number;
  compareAtCents: number | null;
  unitPrice: UnitPrice | null;
  isWeighed: boolean;
  taxClass: TaxClass;
  storage: Storage;
  primaryImage: ProductImageView | null;
  category: { id: string; slug: string; name: string };
};

/** What the Product page needs. */
export type ProductDetail = ProductSummary & {
  description: string | null;
  allergens: string[];
  dietaryTags: string[];
  images: ProductImageView[];
  /** Root Category first, ending with the Product's own Category. */
  breadcrumb: { slug: string; name: string }[];
};

/**
 * Unit Price (glossary): the price per 100 g, per litre or per piece, so
 * packs of different sizes compare fairly. Null when the basis does not fit
 * the pack unit, rather than showing a wrong number.
 */
export function unitPrice(
  basis: UnitPriceBasis,
  unit: PackSizeUnit,
  priceCents: number,
  packSizeValue: number
): UnitPrice | null {
  const cents =
    basis === "per_100g" && unit === "g"
      ? prorate(priceCents, 100, packSizeValue)
      : basis === "per_litre" && unit === "ml"
        ? prorate(priceCents, 1000, packSizeValue)
        : basis === "per_piece" && unit === "pc"
          ? prorate(priceCents, 1, packSizeValue)
          : basis === "per_piece"
            ? priceCents // one piece sold by weight, such as a whole papaya
            : null;
  return cents === null ? null : { cents, basis };
}

const summarySelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  packSizeValue: true,
  packSizeUnit: true,
  unitPriceBasis: true,
  priceCents: true,
  compareAtCents: true,
  isWeighed: true,
  taxClass: true,
  storage: true,
  category: { select: { id: true, slug: true, name: true } },
  images: {
    select: { url: true, alt: true },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  },
} satisfies Prisma.ProductSelect;

type SummaryRow = Prisma.ProductGetPayload<{ select: typeof summarySelect }>;

function toSummary(row: SummaryRow): ProductSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    packSize: { value: row.packSizeValue, unit: row.packSizeUnit },
    priceCents: row.priceCents,
    compareAtCents: row.compareAtCents,
    unitPrice: unitPrice(
      row.unitPriceBasis,
      row.packSizeUnit,
      row.priceCents,
      row.packSizeValue
    ),
    isWeighed: row.isWeighed,
    taxClass: row.taxClass,
    storage: row.storage,
    primaryImage: row.images[0] ?? null,
    category: row.category,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Active Products by id, in the order given. Unknown or hidden ids are skipped. */
export async function loadSummaries(ids: string[]): Promise<ProductSummary[]> {
  const valid = ids.filter((id) => UUID.test(id));
  if (valid.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: valid }, status: "active" },
    select: summarySelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toSummary(r)]));
  return valid.flatMap((id) => byId.get(id) ?? []);
}

/** An active Product, or null. The id resolves it; the URL slug is cosmetic. */
export async function getProduct(id: string): Promise<ProductDetail | null> {
  if (!UUID.test(id)) return null;
  const row = await db.product.findFirst({
    where: { id, status: "active" },
    select: {
      ...summarySelect,
      description: true,
      allergens: true,
      dietaryTags: true,
    },
  });
  if (!row) return null;
  const category = await getCategory(row.category.slug);
  return {
    ...toSummary(row),
    description: row.description,
    allergens: row.allergens,
    dietaryTags: row.dietaryTags,
    images: row.images,
    breadcrumb: [
      ...(category?.ancestors ?? []),
      { slug: row.category.slug, name: row.category.name },
    ],
  };
}
