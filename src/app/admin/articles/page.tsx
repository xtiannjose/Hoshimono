import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { listArticlesForAdmin } from "@/modules/content";

import { AdminSkeleton, StaffGate } from "../staff-gate";

export const metadata: Metadata = { title: "Articles" };

export default function AdminArticlesPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/articles" area="content">
        <Articles />
      </StaffGate>
    </Suspense>
  );
}

const STATUS = {
  published: "bg-accent-soft text-foreground",
  draft: "bg-warn-soft text-warn",
};

/** Every Article, newest change first (ADR 0013). */
async function Articles() {
  const articles = await listArticlesForAdmin();
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="type-h2">Articles</h1>
        <Link href="/admin/articles/new" className={buttonVariants()}>
          New Article
        </Link>
      </div>
      <div className="rounded-card border-border bg-card overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Articles, {articles.length}</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Article
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
            {articles.length === 0 && (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-4 py-6">
                  No Articles yet. Write the first one with New Article.
                </td>
              </tr>
            )}
            {articles.map((r) => (
              <tr
                key={r.id}
                className="border-border hover:bg-muted/60 border-t"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/admin/articles/${r.id}`}
                    className="font-semibold hover:underline"
                  >
                    {r.title}
                  </Link>
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
