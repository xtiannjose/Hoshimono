import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { categoryAndDescendantIds } from "./categories";
import { loadSummaries, type ProductSummary } from "./products";

/** `featured` is name order until merchandising ranks exist. */
export type ProductSort =
  "featured" | "price_asc" | "price_desc" | "unit_price_asc";

export type ListProductsInput = {
  categorySlug?: string;
  brands?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
  /** Products must carry every tag listed. */
  dietaryTags?: string[];
  sort?: ProductSort;
  limit?: number;
  offset?: number;
};

export type ProductFacets = {
  brands: { name: string; count: number }[];
  dietaryTags: { tag: string; count: number }[];
  priceCents: { min: number; max: number } | null;
};

export type ListProductsResult = {
  items: ProductSummary[];
  total: number;
  /** Counts for the whole Category, ignoring the other filters, so every option stays visible. */
  facets: ProductFacets;
};

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 96;

// Mirrors unitPrice() in products.ts. Grouping by basis first keeps
// per-litre and per-100 g figures from interleaving in one list.
const UNIT_PRICE_ORDER = Prisma.sql`
  p.unit_price_basis,
  CASE
    WHEN p.unit_price_basis = 'per_100g' AND p.pack_size_unit = 'g' THEN p.price_cents * 100.0 / p.pack_size_value
    WHEN p.unit_price_basis = 'per_litre' AND p.pack_size_unit = 'ml' THEN p.price_cents * 1000.0 / p.pack_size_value
    WHEN p.unit_price_basis = 'per_piece' AND p.pack_size_unit = 'pc' THEN p.price_cents * 1.0 / p.pack_size_value
    WHEN p.unit_price_basis = 'per_piece' THEN p.price_cents
  END ASC NULLS LAST`;

const ORDER: Record<ProductSort, Prisma.Sql> = {
  featured: Prisma.sql`p.name ASC`,
  price_asc: Prisma.sql`p.price_cents ASC`,
  price_desc: Prisma.sql`p.price_cents DESC`,
  unit_price_asc: UNIT_PRICE_ORDER,
};

export function clampInt(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

const INT4_MAX = 2_147_483_647;
const MAX_FILTER_VALUES = 50;
const MAX_FILTER_LENGTH = 100;

/** A price bound from the URL: ignored unless it is a real number. */
function priceBound(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value)
    ? clampInt(value, 0, 0, INT4_MAX)
    : undefined;
}

/** Filter values from the URL, capped so a crafted link cannot bloat the query. */
function bounded(values: string[] | undefined): string[] {
  return (values ?? [])
    .slice(0, MAX_FILTER_VALUES)
    .map((v) => v.slice(0, MAX_FILTER_LENGTH));
}

/** Active Products for a Category page, or null when the Category does not exist. */
export async function listProducts(
  input: ListProductsInput
): Promise<ListProductsResult | null> {
  let categoryIds: string[] | null = null;
  if (input.categorySlug !== undefined) {
    categoryIds = await categoryAndDescendantIds(input.categorySlug);
    if (!categoryIds) return null;
  }

  const limit = clampInt(input.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = clampInt(input.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const order = ORDER[input.sort ?? "featured"] ?? ORDER.featured;

  const base = [
    Prisma.sql`p.status = 'active'`,
    ...(categoryIds
      ? [Prisma.sql`p.category_id = ANY(${categoryIds}::uuid[])`]
      : []),
  ];
  const brandFilter = bounded(input.brands);
  const dietaryTags = bounded(input.dietaryTags);
  const minPrice = priceBound(input.minPriceCents);
  const maxPrice = priceBound(input.maxPriceCents);
  const filters = [
    ...base,
    ...(brandFilter.length
      ? [Prisma.sql`p.brand = ANY(${brandFilter}::text[])`]
      : []),
    ...(minPrice !== undefined
      ? [Prisma.sql`p.price_cents >= ${minPrice}`]
      : []),
    ...(maxPrice !== undefined
      ? [Prisma.sql`p.price_cents <= ${maxPrice}`]
      : []),
    ...(dietaryTags.length
      ? [Prisma.sql`p.dietary_tags @> ${dietaryTags}::text[]`]
      : []),
  ];
  const where = Prisma.join(filters, " AND ");
  const baseWhere = Prisma.join(base, " AND ");

  const [rows, counted, brands, tags, prices] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM products p
      WHERE ${where}
      ORDER BY ${order}, p.name ASC, p.id ASC
      LIMIT ${limit} OFFSET ${offset}`,
    db.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS total FROM products p WHERE ${where}`,
    db.$queryRaw<{ name: string; count: number }[]>`
      SELECT p.brand AS name, count(*)::int AS count
      FROM products p
      WHERE ${baseWhere} AND p.brand IS NOT NULL
      GROUP BY p.brand
      ORDER BY count DESC, name ASC`,
    db.$queryRaw<{ tag: string; count: number }[]>`
      SELECT t.tag, count(*)::int AS count
      FROM products p, unnest(p.dietary_tags) AS t(tag)
      WHERE ${baseWhere}
      GROUP BY t.tag
      ORDER BY count DESC, t.tag ASC`,
    db.$queryRaw<{ min: number | null; max: number | null }[]>`
      SELECT min(p.price_cents)::int AS min, max(p.price_cents)::int AS max
      FROM products p
      WHERE ${baseWhere}`,
  ]);

  const items = await loadSummaries(rows.map((r) => r.id));
  const range = prices[0];
  return {
    items,
    total: counted[0]?.total ?? 0,
    facets: {
      brands,
      dietaryTags: tags,
      priceCents:
        range && range.min !== null && range.max !== null
          ? { min: range.min, max: range.max }
          : null,
    },
  };
}
