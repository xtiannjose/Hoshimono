"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { CATALOG_TAG } from "@/app/_data/storefront";
import {
  addProductImage,
  basisFor,
  createCategory,
  createProduct,
  deleteCategory,
  getCategoryForAdmin,
  getProductForAdmin,
  importProductsCsv,
  removeProductImage,
  setPrimaryImage,
  updateCategory,
  updateProduct,
  type FieldError,
  type ImportError,
} from "@/modules/catalog";
import { recordAudit, recordAudits, requireStaff } from "@/modules/identity";
import { parseMoney } from "@/lib/money";

// Every action re-checks the role (docs/03 section 12: per operation),
// records an audit row, and refreshes the storefront cache at once.

async function merchandiser(next: string) {
  return requireStaff("merchandiser", next);
}

export type FormState = {
  errors: Record<string, string>;
  saved?: boolean;
  /** What was submitted, so a form with errors can refill itself. */
  values?: Record<string, string | boolean>;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const list = (fd: FormData, key: string) =>
  text(fd, key)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
const toErrors = (errors: FieldError[]) =>
  Object.fromEntries(errors.map((e) => [e.field || "form", e.message]));

export async function saveProduct(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const id = text(fd, "id");
  const staff = await merchandiser(
    id ? `/admin/products/${id}` : "/admin/products/new"
  );
  const submitted: Record<string, string | boolean> = {
    ...Object.fromEntries(
      [...fd.entries()].filter(([, v]) => typeof v === "string") as [
        string,
        string,
      ][]
    ),
    isWeighed: fd.get("isWeighed") === "on",
  };

  const errors: Record<string, string> = {};
  const price = parseMoney(text(fd, "price"));
  if (price === null)
    errors.priceCents = "Enter a price in pesos, such as 59.00";
  const compareAtText = text(fd, "compareAt");
  const compareAt = compareAtText ? parseMoney(compareAtText) : null;
  if (compareAtText && compareAt === null)
    errors.compareAtCents = "Enter a price in pesos, such as 75.00";
  if (Object.keys(errors).length) return { errors, values: submitted };

  const unit = text(fd, "packSizeUnit") as "g" | "ml" | "pc";
  const before = id ? await getProductForAdmin(id) : null;
  // The form has no Unit Price basis field: keep the stored one (it may be
  // per piece from a CSV) unless the unit changed.
  const unitPriceBasis =
    before && before.packSizeUnit === unit
      ? before.unitPriceBasis
      : basisFor(unit);
  const fields = {
    name: text(fd, "name"),
    brand: text(fd, "brand") || null,
    description: text(fd, "description") || null,
    categoryId: text(fd, "categoryId"),
    packSizeValue: Number(text(fd, "packSizeValue")),
    packSizeUnit: unit,
    unitPriceBasis,
    priceCents: price ?? 0,
    compareAtCents: compareAt,
    taxClass: text(fd, "taxClass"),
    isWeighed: fd.get("isWeighed") === "on",
    storage: text(fd, "storage"),
    status: text(fd, "status"),
    barcode: text(fd, "barcode") || null,
    allergens: list(fd, "allergens"),
    dietaryTags: list(fd, "dietaryTags").map((t) => t.toLowerCase()),
  };

  if (id) {
    const result = await updateProduct(id, fields);
    if (!result.ok)
      return { errors: toErrors(result.errors), values: submitted };
    await recordAudit({
      staffId: staff.id,
      action: "update",
      entity: "product",
      entityId: id,
      before,
      after: fields,
    });
    updateTag(CATALOG_TAG);
    return { errors: {}, saved: true };
  }
  const result = await createProduct(fields);
  if (!result.ok) return { errors: toErrors(result.errors), values: submitted };
  await recordAudit({
    staffId: staff.id,
    action: "create",
    entity: "product",
    entityId: result.id,
    after: fields,
  });
  updateTag(CATALOG_TAG);
  redirect(`/admin/products/${result.id}?created=1`);
}

export async function uploadImage(
  productId: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const staff = await merchandiser(`/admin/products/${productId}`);
  const file = fd.get("image");
  if (!(file instanceof File) || file.size === 0)
    return { errors: { image: "Choose an image file" } };
  const result = await addProductImage(productId, {
    bytes: Buffer.from(await file.arrayBuffer()),
    alt: text(fd, "alt"),
  });
  if (!result.ok) return { errors: toErrors(result.errors) };
  await recordAudit({
    staffId: staff.id,
    action: "add-image",
    entity: "product",
    entityId: productId,
    after: { imageId: result.id },
  });
  updateTag(CATALOG_TAG);
  return { errors: {}, saved: true };
}

export async function makePrimaryImage(productId: string, imageId: string) {
  const staff = await merchandiser(`/admin/products/${productId}`);
  const result = await setPrimaryImage(imageId);
  if (result.ok) {
    await recordAudit({
      staffId: staff.id,
      action: "primary-image",
      entity: "product",
      entityId: productId,
      after: { imageId },
    });
    updateTag(CATALOG_TAG);
  }
}

export async function deleteImage(productId: string, imageId: string) {
  const staff = await merchandiser(`/admin/products/${productId}`);
  const result = await removeProductImage(imageId);
  if (result.ok) {
    await recordAudit({
      staffId: staff.id,
      action: "remove-image",
      entity: "product",
      entityId: productId,
      before: { imageId, ...result.removed },
    });
    updateTag(CATALOG_TAG);
  }
}

export type ImportState =
  | { status: "idle" }
  | { status: "done"; created: number; updated: number }
  | { status: "failed"; errors: ImportError[] };

const MAX_CSV_BYTES = 5 * 1024 * 1024;

export async function importCsv(
  _prev: ImportState,
  fd: FormData
): Promise<ImportState> {
  const staff = await merchandiser("/admin/import");
  const file = fd.get("file");
  const fail = (message: string): ImportState => ({
    status: "failed",
    errors: [{ row: 1, field: "file", message }],
  });
  if (!(file instanceof File) || file.size === 0)
    return fail("Choose a CSV file");
  if (file.size > MAX_CSV_BYTES)
    return fail("Use a file under 5 MB, or split it");
  const result = await importProductsCsv(await file.text());
  if (!result.ok) return { status: "failed", errors: result.errors };
  await recordAudit({
    staffId: staff.id,
    action: "import",
    entity: "product",
    entityId: "csv",
    after: {
      file: file.name,
      created: result.created,
      updated: result.updated,
    },
  });
  await recordAudits(
    result.changes.map((change) => ({
      staffId: staff.id,
      action: change.before ? "import-update" : "import-create",
      entity: "product",
      entityId: change.id,
      before: change.before,
      after: change.after,
    }))
  );
  updateTag(CATALOG_TAG);
  return { status: "done", created: result.created, updated: result.updated };
}

export async function addCategory(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const staff = await merchandiser("/admin/categories");
  const result = await createCategory({
    name: text(fd, "name"),
    parentSlug: text(fd, "parent") || null,
  });
  if (!result.ok) return { errors: toErrors(result.errors) };
  await recordAudit({
    staffId: staff.id,
    action: "create",
    entity: "category",
    entityId: result.id,
    after: { name: text(fd, "name") },
  });
  updateTag(CATALOG_TAG);
  return { errors: {}, saved: true };
}

export async function editCategory(
  id: string,
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const staff = await merchandiser("/admin/categories");
  const parent = text(fd, "parentId");
  const patch = {
    name: text(fd, "name"),
    parentId: parent === "" ? null : parent,
    sortOrder: Number(text(fd, "sortOrder") || 0),
  };
  const before = await getCategoryForAdmin(id);
  const result = await updateCategory(id, patch);
  if (!result.ok) return { errors: toErrors(result.errors) };
  await recordAudit({
    staffId: staff.id,
    action: "update",
    entity: "category",
    entityId: id,
    before,
    after: patch,
  });
  updateTag(CATALOG_TAG);
  return { errors: {}, saved: true };
}

export async function removeCategory(
  id: string,
  _prev: FormState
): Promise<FormState> {
  const staff = await merchandiser("/admin/categories");
  const before = await getCategoryForAdmin(id);
  const result = await deleteCategory(id);
  if (!result.ok) return { errors: toErrors(result.errors) };
  await recordAudit({
    staffId: staff.id,
    action: "delete",
    entity: "category",
    entityId: id,
    before,
  });
  updateTag(CATALOG_TAG);
  return { errors: {}, saved: true };
}
