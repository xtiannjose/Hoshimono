import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { listRecipesForAdmin } from "@/modules/content";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Recipes" };

export default function AdminRecipesPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/recipes" area="content">
        <Recipes />
      </StaffGate>
    </Suspense>
  );
}

const STATUS = {
  published: "bg-accent-soft text-foreground",
  draft: "bg-warn-soft text-warn",
};

/** Every Recipe, newest change first (ADR 0013). */
async function Recipes() {
  const recipes = await listRecipesForAdmin();
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-h2">Recipes</h1>
        <Link href="/admin/recipes/new" className={buttonVariants()}>
          New Recipe
        </Link>
      </div>
      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Recipes, {recipes.length}</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Recipe
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Last changed
              </th>
            </tr>
          </thead>
          <tbody>
            {recipes.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-4 py-6">
                  No Recipes yet. Write the first one with New Recipe.
                </td>
              </tr>
            )}
            {recipes.map((r) => (
              <tr
                key={r.id}
                className="border-border hover:bg-muted/60 border-t"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/recipes/${r.id}`}
                    className="font-semibold hover:underline"
                  >
                    {r.title}
                  </Link>
                  {r.featured && r.status === "published" && (
                    <span className="text-muted-foreground"> (on Home)</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-pill px-2 py-0.5 text-xs font-bold ${STATUS[r.status]}`}
                  >
                    {r.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                  {formatDateTime(r.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
