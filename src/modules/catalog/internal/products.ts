import type { Prisma } from "@/generated/prisma/client";
import type {
  PackSizeUnit,
  Storage,
  TaxClass,
  UnitPriceBasis,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { prorate } from "@/lib/money";
import { activePromotions, promotedPrice } from "@/modules/pricing";
import { isUuid } from "@/lib/uuid";

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
  /** `topSlug`: the top-level Category's slug (its own when top-level). */
  category: { id: string; slug: string; name: string; topSlug: string };
  /** The running Promotion's name; priceCents is then the promoted price. */
  promotion: string | null;
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
  category: {
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      parent: { select: { slug: true } },
    },
  },
  // Cards and Carts show one image; getProduct asks for the whole gallery.
  images: {
    select: { url: true, alt: true },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    take: 1,
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
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      // Two levels deep (docs/04), so the parent is the top level.
      topSlug: row.category.parent?.slug ?? row.category.slug,
    },
    promotion: null,
  };
}

/**
 * Summaries at today's shelf price: a running Promotion lowers the price,
 * and the regular price becomes the struck-through one (ADR 0015).
 * shortcut: Categories are two levels deep, so a Product's Category and its
 * parent are all a Promotion can name.
 */
async function promoted(rows: SummaryRow[]): Promise<ProductSummary[]> {
  const promotions = rows.length > 0 ? await activePromotions() : [];
  return rows.map((row) => {
    const summary = toSummary(row);
    const promo = promotedPrice(
      {
        id: row.id,
        categoryIds: [row.category.id, row.category.parentId].filter(
          (id): id is string => id !== null
        ),
      },
      row.priceCents,
      promotions
    );
    return promo
      ? {
          ...summary,
          priceCents: promo.priceCents,
          compareAtCents: row.priceCents,
          unitPrice: unitPrice(
            row.unitPriceBasis,
            row.packSizeUnit,
            promo.priceCents,
            row.packSizeValue
          ),
          promotion: promo.name,
        }
      : summary;
  });
}

/** Active Products by id, in the order given. Unknown or hidden ids are skipped. */
export async function loadSummaries(ids: string[]): Promise<ProductSummary[]> {
  const valid = ids.filter((id) => isUuid(id));
  if (valid.length === 0) return [];
  const rows = await db.product.findMany({
    where: { id: { in: valid }, status: "active" },
    select: summarySelect,
  });
  const byId = new Map((await promoted(rows)).map((s) => [s.id, s]));
  return valid.flatMap((id) => byId.get(id) ?? []);
}

/** An active Product, or null. The id resolves it; the URL slug is cosmetic. */
export async function getProduct(id: string): Promise<ProductDetail | null> {
  if (!isUuid(id)) return null;
  const row = await db.product.findFirst({
    where: { id, status: "active" },
    select: {
      ...summarySelect,
      images: {
        select: { url: true, alt: true },
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      },
      description: true,
      allergens: true,
      dietaryTags: true,
    },
  });
  if (!row) return null;
  const category = await getCategory(row.category.slug);
  return {
    ...(await promoted([row]))[0],
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
