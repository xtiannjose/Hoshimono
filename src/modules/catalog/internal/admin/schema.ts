import { z } from "zod";

import { parseMoney } from "@/lib/money";

/**
 * One rule set for a Product, used by the admin form and the CSV import.
 * Money is integer centavos (ADR 0002); the CSV and form take pesos.
 */
export const productFields = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter a name of at least 2 letters")
      .max(120),
    brand: z.string().trim().max(60).nullable(),
    description: z.string().trim().max(2000).nullable(),
    categoryId: z.guid("Choose a Category"),
    packSizeValue: z
      .int("Enter a whole number, such as 500")
      .positive("Enter a pack size above 0")
      .max(1_000_000),
    packSizeUnit: z.enum(["g", "ml", "pc"], "Use g, ml or pc"),
    unitPriceBasis: z.enum(["per_100g", "per_litre", "per_piece"]),
    // PHP 100,000: 99 of the dearest Product still fit in an int4 total.
    priceCents: z
      .int()
      .min(0)
      .max(10_000_000, "Enter a price up to 100,000.00"),
    compareAtCents: z
      .int()
      .min(0)
      .max(10_000_000, "Enter a price up to 100,000.00")
      .nullable(),
    taxClass: z.enum(
      ["vatable", "vat_exempt", "zero_rated"],
      "Use vatable, vat_exempt or zero_rated"
    ),
    isWeighed: z.boolean(),
    storage: z.enum(
      ["ambient", "chilled", "frozen"],
      "Use ambient, chilled or frozen"
    ),
    status: z.enum(
      ["draft", "active", "archived"],
      "Use draft, active or archived"
    ),
    barcode: z
      .string()
      .regex(/^\d{8,14}$/, "Use 8 to 14 digits")
      .nullable(),
    allergens: z.array(z.string().trim().min(1).max(40)).max(20),
    dietaryTags: z
      .array(
        z
          .string()
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Use lowercase words joined by -"
          )
      )
      .max(20),
  })
  .superRefine((p, ctx) => {
    if (p.compareAtCents !== null && p.compareAtCents <= p.priceCents) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtCents"],
        message: "The compare-at price must be higher than the price",
      });
    }
    if (p.isWeighed && p.packSizeUnit !== "g") {
      ctx.addIssue({
        code: "custom",
        path: ["packSizeUnit"],
        message: "A Product sold by weight needs its pack size in g",
      });
    }
  });

export type ProductFields = z.infer<typeof productFields>;

export function basisFor(unit: "g" | "ml" | "pc") {
  return unit === "g" ? "per_100g" : unit === "ml" ? "per_litre" : "per_piece";
}

// ---------- CSV ----------

/** CSV columns, in export order. Required ones must be present to import. */
export const CSV_COLUMNS = [
  "slug",
  "name",
  "brand",
  "category",
  "pack_size_value",
  "pack_size_unit",
  "unit_price_basis",
  "price",
  "compare_at_price",
  "tax_class",
  "is_weighed",
  "storage",
  "status",
  "barcode",
  "description",
  "allergens",
  "dietary_tags",
] as const;
export type CsvColumn = (typeof CSV_COLUMNS)[number];

export const REQUIRED_COLUMNS: CsvColumn[] = [
  "name",
  "category",
  "pack_size_value",
  "pack_size_unit",
  "price",
  "tax_class",
];

/** Which CSV column each schema field comes from, for error reports. */
export const COLUMN_FOR_FIELD: Record<string, CsvColumn> = {
  name: "name",
  brand: "brand",
  description: "description",
  categoryId: "category",
  packSizeValue: "pack_size_value",
  packSizeUnit: "pack_size_unit",
  unitPriceBasis: "unit_price_basis",
  priceCents: "price",
  compareAtCents: "compare_at_price",
  taxClass: "tax_class",
  isWeighed: "is_weighed",
  storage: "storage",
  status: "status",
  barcode: "barcode",
  allergens: "allergens",
  dietaryTags: "dietary_tags",
};

const YES = new Set(["yes", "y", "true", "1"]);
const NO = new Set(["no", "n", "false", "0", ""]);

/** Undo the export's formula guard: "'=..." was written for spreadsheets. */
export function unguard(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

export type CellError = { field: CsvColumn; message: string };

/**
 * A CSV row as raw schema input. Cells that cannot even be read (a price
 * that is not money) come back as errors before the schema runs.
 */
export function readRow(cell: (column: CsvColumn) => string): {
  input: Record<string, unknown>;
  errors: CellError[];
} {
  const errors: CellError[] = [];
  const text = (c: CsvColumn) => unguard(cell(c)).trim();
  const optional = (c: CsvColumn) => text(c) || null;
  const money = (c: CsvColumn, required: boolean) => {
    const raw = text(c);
    if (!raw) {
      if (required)
        errors.push({
          field: c,
          message: "Enter a price in pesos, such as 59.00",
        });
      return null;
    }
    const cents = parseMoney(raw);
    if (cents === null)
      errors.push({
        field: c,
        message: "Enter a price in pesos, such as 59.00",
      });
    return cents;
  };
  const yesNo = (c: CsvColumn) => {
    const raw = text(c).toLowerCase();
    if (YES.has(raw)) return true;
    if (NO.has(raw)) return false;
    errors.push({ field: c, message: "Use yes or no" });
    return false;
  };
  const list = (c: CsvColumn) =>
    text(c)
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

  const unit = text("pack_size_unit").toLowerCase();
  const size = Number(text("pack_size_value"));
  const input = {
    name: text("name"),
    brand: optional("brand"),
    description: optional("description"),
    packSizeValue: size,
    packSizeUnit: unit,
    unitPriceBasis:
      text("unit_price_basis") ||
      (unit === "g" || unit === "ml" || unit === "pc" ? basisFor(unit) : ""),
    priceCents: money("price", true),
    compareAtCents: money("compare_at_price", false),
    taxClass: text("tax_class").toLowerCase(),
    isWeighed: yesNo("is_weighed"),
    storage: text("storage").toLowerCase() || "ambient",
    status: text("status").toLowerCase() || "draft",
    barcode: optional("barcode"),
    allergens: list("allergens"),
    dietaryTags: list("dietary_tags").map((t) => t.toLowerCase()),
  };
  return { input, errors };
}

/** CSV cells for one Product, the inverse of readRow. */
export function writeRow(
  p: ProductFields & { slug: string; categorySlug: string }
): string[] {
  const pesos = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));
  const value: Record<CsvColumn, string> = {
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? "",
    category: p.categorySlug,
    pack_size_value: String(p.packSizeValue),
    pack_size_unit: p.packSizeUnit,
    unit_price_basis: p.unitPriceBasis,
    price: pesos(p.priceCents),
    compare_at_price: pesos(p.compareAtCents),
    tax_class: p.taxClass,
    is_weighed: p.isWeighed ? "yes" : "no",
    storage: p.storage,
    status: p.status,
    barcode: p.barcode ?? "",
    description: p.description ?? "",
    allergens: p.allergens.join(";"),
    dietary_tags: p.dietaryTags.join(";"),
  };
  return CSV_COLUMNS.map((c) => value[c]);
}
