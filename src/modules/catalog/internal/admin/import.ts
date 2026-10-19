import { parseCsv, toCsv } from "@/lib/csv";
import { db, inTransaction, type Client } from "@/lib/db";
import { productSlug, slugify } from "@/lib/slug";

import {
  COLUMN_FOR_FIELD,
  CSV_COLUMNS,
  productFields,
  readRow,
  REQUIRED_COLUMNS,
  unguard,
  writeRow,
  type CsvColumn,
  type ProductFields,
} from "./schema";

export type ImportError = {
  row: number;
  field: CsvColumn | "file";
  message: string;
};
/** One saved Product, for the audit log: before is null when it is new. */
export type ImportChange = {
  id: string;
  before: ProductFields | null;
  after: ProductFields;
};
export type ImportResult =
  | { ok: true; created: number; updated: number; changes: ImportChange[] }
  | { ok: false; errors: ImportError[] };

const MAX_ROWS = 5000;
const MAX_REPORTED = 200;

/**
 * Bulk create or update Products from a CSV (PRD ADM-1). All or nothing:
 * any error means nothing is saved, and the report says which row and
 * column to fix. Rows match existing Products by slug (brand and name).
 */
/** A 500-row import can take a while; callers wrapping it use this too. */
export const CSV_IMPORT_TIMEOUT_MS = 120_000;

export async function importProductsCsv(
  text: string,
  client: Client = db
): Promise<ImportResult> {
  const rows = parseCsv(text);
  const fail = (message: string): ImportResult => ({
    ok: false,
    errors: [{ row: 1, field: "file", message }],
  });
  if (rows.length < 2)
    return fail("The file has no Product rows under the header");
  if (rows.length - 1 > MAX_ROWS)
    return fail(`Import at most ${MAX_ROWS} rows at a time`);

  const header = rows[0].map((h) =>
    unguard(h).trim().toLowerCase().replaceAll(" ", "_")
  );
  const unknown = header.filter(
    (h) => h && !(CSV_COLUMNS as readonly string[]).includes(h)
  );
  if (unknown.length) return fail(`Unknown column: ${unknown.join(", ")}`);
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return fail(`Missing column: ${missing.join(", ")}`);
  const index = new Map(header.map((h, i) => [h, i]));

  const [categories, existing] = await Promise.all([
    client.category.findMany({ select: { id: true, slug: true } }),
    client.product.findMany({
      include: { category: { select: { slug: true } } },
    }),
  ]);
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const existingBySlug = new Map(existing.map((p) => [p.slug, p]));
  const barcodeOwner = new Map(
    existing.flatMap((p) => (p.barcode ? [[p.barcode, p.slug] as const] : []))
  );
  // Without a brand or slug column, rows can only match by name.
  const matchByName = !index.has("brand") && !index.has("slug");
  const byName = new Map<string, typeof existing>();
  for (const p of existing) {
    const key = p.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), p]);
  }

  const errors: ImportError[] = [];
  const valid: { slug: string; fields: ProductFields }[] = [];
  const firstRowOf = new Map<string, number>();
  const barcodeRow = new Map<string, number>();

  rows.slice(1).forEach((cells, i) => {
    const row = i + 2; // the header is row 1
    // Spreadsheets often save empty rows under the data.
    if (cells.every((c) => !unguard(c).trim())) return;
    const given = (c: CsvColumn) => {
      const at = index.get(c);
      return at === undefined ? "" : (cells[at] ?? "");
    };
    const rowErrors: ImportError[] = [];

    // Find the Product this row updates, if any.
    const name = unguard(given("name")).trim();
    let match: (typeof existing)[number] | undefined;
    if (index.has("slug") && unguard(given("slug")).trim()) {
      match = existingBySlug.get(slugify(unguard(given("slug")).trim()));
    } else if (matchByName) {
      const named = byName.get(name.toLowerCase()) ?? [];
      if (named.length > 1) {
        rowErrors.push({
          row,
          field: "name",
          message: `Several Products are named "${name}". Add the brand or slug column.`,
        });
      }
      match = named.length === 1 ? named[0] : undefined;
    } else {
      match = existingBySlug.get(
        productSlug(unguard(given("brand")).trim() || null, name)
      );
    }

    // A column the file leaves out keeps the Product's current value; only
    // new Products get the defaults.
    const current = match
      ? writeRow({ ...match, categorySlug: match.category.slug })
      : null;
    const cell = (c: CsvColumn) =>
      index.has(c) || !current ? given(c) : current[CSV_COLUMNS.indexOf(c)];
    const read = readRow(cell);
    rowErrors.push(...read.errors.map((e) => ({ row, ...e })));

    const categorySlug = unguard(cell("category")).trim().toLowerCase();
    const category = categoryId.get(categorySlug);
    if (!category) {
      rowErrors.push({
        row,
        field: "category",
        message: `No Category with the slug "${categorySlug}"`,
      });
    }

    const slug = match
      ? match.slug
      : unguard(cell("slug")).trim()
        ? slugify(unguard(cell("slug")).trim())
        : productSlug(read.input.brand as string | null, name);

    const barcode = read.input.barcode as string | null;
    if (barcode && /e\+|\./i.test(barcode)) {
      rowErrors.push({
        row,
        field: "barcode",
        message: `"${barcode}" looks changed by a spreadsheet. Format the barcode column as Text and type the full number again.`,
      });
    } else if (barcode && barcodeRow.has(barcode)) {
      rowErrors.push({
        row,
        field: "barcode",
        message: `Same barcode as row ${barcodeRow.get(barcode)}`,
      });
    } else if (barcode && (barcodeOwner.get(barcode) ?? slug) !== slug) {
      rowErrors.push({
        row,
        field: "barcode",
        message: "Another Product already has this barcode",
      });
    }
    if (barcode) barcodeRow.set(barcode, barcodeRow.get(barcode) ?? row);
    if (slug && firstRowOf.has(slug)) {
      rowErrors.push({
        row,
        field: "name",
        message: `Same Product as row ${firstRowOf.get(slug)} (brand and name must be unique)`,
      });
    } else if (slug) {
      firstRowOf.set(slug, row);
    }

    const parsed = productFields.safeParse({
      ...read.input,
      categoryId: category ?? "",
    });
    if (!parsed.success) {
      const reported = new Set(rowErrors.map((e) => e.field));
      for (const issue of parsed.error.issues) {
        const field = COLUMN_FOR_FIELD[String(issue.path[0])] ?? "file";
        if (reported.has(field)) continue;
        reported.add(field);
        rowErrors.push({ row, field, message: issue.message });
      }
    }
    if (!slug && !rowErrors.some((e) => e.field === "name")) {
      rowErrors.push({ row, field: "name", message: "Enter a name" });
    }

    if (rowErrors.length) errors.push(...rowErrors);
    else if (parsed.success) valid.push({ slug, fields: parsed.data });
  });

  if (errors.length)
    return { ok: false, errors: errors.slice(0, MAX_REPORTED) };

  let created = 0;
  let updated = 0;
  const changes: ImportChange[] = [];
  const now = new Date();
  await inTransaction(
    client,
    async (tx) => {
      for (const { slug, fields } of valid) {
        const before = existingBySlug.get(slug);
        const archivedAt =
          fields.status === "archived" ? (before?.archivedAt ?? now) : null;
        if (before) {
          await tx.product.update({
            where: { id: before.id },
            data: { ...fields, archivedAt },
          });
          changes.push({
            id: before.id,
            before: pickFields(before),
            after: fields,
          });
          updated++;
        } else {
          const made = await tx.product.create({
            data: { ...fields, slug, archivedAt },
            select: { id: true },
          });
          changes.push({ id: made.id, before: null, after: fields });
          created++;
        }
      }
    },
    { timeout: CSV_IMPORT_TIMEOUT_MS }
  );
  return { ok: true, created, updated, changes };
}

function pickFields(p: ProductFields): ProductFields {
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

/** Every Product, drafts and archived included, in the import format. */
export async function exportProductsCsv(): Promise<string> {
  const products = await db.product.findMany({
    orderBy: { slug: "asc" },
    include: { category: { select: { slug: true } } },
  });
  return toCsv([
    [...CSV_COLUMNS],
    ...products.map((p) => writeRow({ ...p, categorySlug: p.category.slug })),
  ]);
}
