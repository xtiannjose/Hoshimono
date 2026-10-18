import { parseCsv, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
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
export type ImportResult =
  | { ok: true; created: number; updated: number }
  | { ok: false; errors: ImportError[] };

const MAX_ROWS = 5000;
const MAX_REPORTED = 200;

/**
 * Bulk create or update Products from a CSV (PRD ADM-1). All or nothing:
 * any error means nothing is saved, and the report says which row and
 * column to fix. Rows match existing Products by slug (brand and name).
 */
export async function importProductsCsv(text: string): Promise<ImportResult> {
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
    db.category.findMany({ select: { id: true, slug: true } }),
    db.product.findMany({ select: { id: true, slug: true, archivedAt: true } }),
  ]);
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const existingBySlug = new Map(existing.map((p) => [p.slug, p]));

  const errors: ImportError[] = [];
  const valid: { slug: string; fields: ProductFields }[] = [];
  const firstRowOf = new Map<string, number>();

  rows.slice(1).forEach((cells, i) => {
    const row = i + 2; // the header is row 1
    const cell = (c: CsvColumn) => {
      const at = index.get(c);
      return at === undefined ? "" : (cells[at] ?? "");
    };
    const read = readRow(cell);
    const rowErrors: ImportError[] = read.errors.map((e) => ({ row, ...e }));

    const categorySlug = unguard(cell("category")).trim().toLowerCase();
    const category = categoryId.get(categorySlug);
    if (!category) {
      rowErrors.push({
        row,
        field: "category",
        message: `No Category with the slug "${categorySlug}"`,
      });
    }

    const given = unguard(cell("slug")).trim();
    const name = String(read.input.name ?? "");
    const slug = given
      ? slugify(given)
      : productSlug(read.input.brand as string | null, name);
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
  const now = new Date();
  await db.$transaction(
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
          updated++;
        } else {
          await tx.product.create({ data: { ...fields, slug, archivedAt } });
          created++;
        }
      }
    },
    { timeout: 120_000 }
  );
  return { ok: true, created, updated };
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
