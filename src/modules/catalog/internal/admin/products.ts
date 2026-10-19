import type { Prisma } from "@/generated/prisma/client";
import { db, type Client } from "@/lib/db";
import { productSlug } from "@/lib/slug";
import { isUuid } from "@/lib/uuid";

import { productFields, type ProductFields } from "./schema";

export type FieldError = { field: string; message: string };
export type WriteResult<T = object> =
  ({ ok: true } & T) | { ok: false; errors: FieldError[] };

function validate(input: unknown): WriteResult<{ fields: ProductFields }> {
  const parsed = productFields.safeParse(input);
  if (parsed.success) return { ok: true, fields: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => ({
      field: String(i.path[0] ?? ""),
      message: i.message,
    })),
  };
}

const archivedAtFor = (status: string, current: Date | null) =>
  status === "archived" ? (current ?? new Date()) : null;

/** A new Product; its slug comes from brand and name and never changes. */
export async function createProduct(
  input: unknown,
  client: Client = db
): Promise<WriteResult<{ id: string }>> {
  const checked = validate(input);
  if (!checked.ok) return checked;
  const slug = productSlug(checked.fields.brand, checked.fields.name);
  if (!slug) {
    return {
      ok: false,
      errors: [
        { field: "name", message: "Use letters or numbers in the name" },
      ],
    };
  }
  const taken = await barcodeTaken(checked.fields.barcode, null, client);
  if (taken) return taken;
  if (
    await client.product.findUnique({ where: { slug }, select: { id: true } })
  ) {
    return {
      ok: false,
      errors: [
        {
          field: "name",
          message: "A Product with this brand and name already exists",
        },
      ],
    };
  }
  // The unique indexes on slug and barcode still guard two saves at once.
  const created = await client.product.create({
    data: {
      ...checked.fields,
      slug,
      archivedAt: archivedAtFor(checked.fields.status, null),
    },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

const BARCODE_TAKEN = {
  ok: false as const,
  errors: [
    { field: "barcode", message: "Another Product already has this barcode" },
  ],
};

async function barcodeTaken(
  barcode: string | null,
  self: string | null,
  client: Client
) {
  if (!barcode) return null;
  const owner = await client.product.findUnique({
    where: { barcode },
    select: { id: true },
  });
  return owner && owner.id !== self ? BARCODE_TAKEN : null;
}

/** Changes some fields of a Product; the whole Product is checked again. */
export async function updateProduct(
  id: string,
  // Unchecked input: the merged Product is validated before saving.
  patch: { [K in keyof ProductFields]?: unknown },
  client: Client = db
): Promise<WriteResult> {
  if (!isUuid(id))
    return { ok: false, errors: [{ field: "", message: "No such Product" }] };
  const current = await client.product.findUnique({ where: { id } });
  if (!current)
    return { ok: false, errors: [{ field: "", message: "No such Product" }] };
  const checked = validate({ ...pick(current), ...patch });
  if (!checked.ok) return checked;
  const taken = await barcodeTaken(checked.fields.barcode, id, client);
  if (taken) return taken;
  await client.product.update({
    where: { id },
    data: {
      ...checked.fields,
      archivedAt: archivedAtFor(checked.fields.status, current.archivedAt),
    },
  });
  return { ok: true };
}

function pick(p: Prisma.ProductGetPayload<object>): ProductFields {
  return {
    name: p.name,
    brand: p.brand,
    description: p.description,
    categoryId: p.categoryId,
    packSizeValue: p.packSizeValue,
    packSizeUnit: p.packSizeUnit,
    unitPriceBasis: p.unitPriceBasis,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    taxClass: p.taxClass,
    isWeighed: p.isWeighed,
    storage: p.storage,
    status: p.status,
    barcode: p.barcode,
    allergens: p.allergens,
    dietaryTags: p.dietaryTags,
  };
}

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  categoryName: string;
  priceCents: number;
  status: "draft" | "active" | "archived";
  updatedAt: Date;
};

const ADMIN_SORTS = {
  name: { name: "asc" },
  price: { priceCents: "asc" },
  updated: { updatedAt: "desc" },
} as const;

/** Every Product for the admin list, drafts and archived included. */
export async function listProductsForAdmin(input: {
  q?: string;
  status?: "draft" | "active" | "archived";
  sort?: keyof typeof ADMIN_SORTS;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AdminProductRow[]; total: number }> {
  const q = input.q?.trim().slice(0, 100);
  const where: Prisma.ProductWhereInput = {
    ...(input.status && { status: input.status }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { slug: { contains: q.toLowerCase() } },
        { barcode: q },
      ],
    }),
  };
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [
        ADMIN_SORTS[input.sort ?? "name"] ?? ADMIN_SORTS.name,
        { id: "asc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        priceCents: true,
        status: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
    }),
    db.product.count({ where }),
  ]);
  return {
    rows: rows.map(({ category, ...r }) => ({
      ...r,
      categoryName: category.name,
    })),
    total,
  };
}

/** A Product with everything the edit form shows, any status. */
export async function getProductForAdmin(id: string) {
  if (!isUuid(id)) return null;
  const p = await db.product.findUnique({
    where: { id },
    include: {
      category: { select: { slug: true } },
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    ...pick(p),
    categorySlug: p.category.slug,
    images: p.images.map((i) => ({
      id: i.id,
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })),
  };
}
