import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import and export" };

const COLUMNS: [string, string][] = [
  ["name", "Required. Product name as Customers say it, such as Fresh Milk."],
  [
    "brand",
    "Optional. With the name it identifies the Product, so a later import updates it.",
  ],
  ["category", "Required. The Category slug, such as milk or rice."],
  ["pack_size_value", "Required. A whole number, such as 500."],
  ["pack_size_unit", "Required. g, ml or pc."],
  ["price", "Required. Pesos with VAT included, such as 59.00."],
  ["compare_at_price", "Optional. The old price, higher than price."],
  ["tax_class", "Required. vatable, vat_exempt or zero_rated."],
  ["is_weighed", "yes or no. Weighed Products need pack_size_unit g."],
  ["storage", "ambient, chilled or frozen. Default ambient."],
  ["status", "draft, active or archived. Default draft."],
  ["barcode", "Optional. 8 to 14 digits."],
  ["description", "Optional."],
  ["allergens", "Optional. Separate with ; such as milk;soy"],
  [
    "dietary_tags",
    "Optional. Lowercase, separate with ; such as vegan;low-fat",
  ],
  [
    "slug, unit_price_basis",
    "Optional. Leave out unless you know you need them.",
  ],
];

export default function ImportPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/import">
        <section className="grid gap-6">
          <div className="grid gap-2">
            <h1 className="type-h2">Import and export</h1>
            <p className="text-muted-foreground max-w-2xl">
              Start from an export: it has every column and every Product. Edit
              it in Excel or Google Sheets, save as CSV, then import it here.
            </p>
            <p>
              <a
                href="/admin/export"
                className="font-semibold underline underline-offset-4"
              >
                Download all Products as CSV
              </a>
            </p>
          </div>
          <ImportForm />
          <details className="rounded-card border-border bg-card max-w-3xl border px-5 py-1">
            <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
              Columns
            </summary>
            <dl className="grid gap-2 pb-4 text-sm">
              {COLUMNS.map(([name, help]) => (
                <div key={name} className="grid gap-1 sm:grid-cols-[200px_1fr]">
                  <dt className="font-mono text-[13px] font-semibold">
                    {name}
                  </dt>
                  <dd className="text-muted-foreground">{help}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>
      </StaffGate>
    </Suspense>
  );
}
