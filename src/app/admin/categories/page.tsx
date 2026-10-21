import type { Metadata } from "next";
import { Suspense } from "react";

import { listCategoriesForAdmin } from "@/modules/catalog";

import { AdminSkeleton, StaffGate } from "../staff-gate";
import { CategoryRow, NewCategoryForm } from "./category-forms";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/categories">
        <Categories />
      </StaffGate>
    </Suspense>
  );
}

async function Categories() {
  const rows = await listCategoriesForAdmin();
  const children = new Map<string | null, typeof rows>();
  for (const r of rows)
    children.set(r.parentId, [...(children.get(r.parentId) ?? []), r]);

  // Tree order with depth, so rows indent under their parent (PRD ADM-2).
  const ordered: {
    row: (typeof rows)[number];
    depth: number;
    label: string;
  }[] = [];
  const walk = (parent: string | null, depth: number, prefix: string) => {
    for (const r of children.get(parent) ?? []) {
      const label = prefix ? `${prefix} > ${r.name}` : r.name;
      ordered.push({ row: r, depth, label });
      walk(r.id, depth + 1, label);
    }
  };
  walk(null, 0, "");
  const parents = ordered.map((o) => ({ value: o.row.id, label: o.label }));
  const parentSlugs = ordered.map((o) => ({
    value: o.row.slug,
    label: o.label,
  }));

  return (
    <section className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="type-h2">Categories</h1>
        <p className="text-muted-foreground max-w-2xl">
          Up to three levels. A Category keeps its web address when renamed or
          moved. Only empty Categories can be deleted.
        </p>
      </div>
      <NewCategoryForm parents={parentSlugs} />
      <ul className="max-w-5xl">
        {ordered.map(({ row, depth }) => (
          <CategoryRow
            key={row.id}
            id={row.id}
            name={row.name}
            parentId={row.parentId}
            sortOrder={row.sortOrder}
            searchWords={row.searchWords ?? ""}
            productCount={row.productCount}
            depth={depth}
            parents={parents}
          />
        ))}
      </ul>
    </section>
  );
}
