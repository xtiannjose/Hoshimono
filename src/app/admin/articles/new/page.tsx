import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { productChoices } from "../../content/choices";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { ArticleEditor } from "../article-editor";

export const metadata: Metadata = { title: "New Article" };

export default function NewArticlePage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/articles/new" area="content">
        <NewArticle />
      </StaffGate>
    </Suspense>
  );
}

async function NewArticle() {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/articles"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Articles
        </Link>
        <h1 className="type-h2">New Article</h1>
        <p className="text-muted-foreground">
          Saved as a Draft until you publish it. Add the photo after the first
          save.
        </p>
      </div>
      <ArticleEditor
        id={null}
        products={await productChoices()}
        article={{
          title: "",
          intro: "",
          status: "draft",
          sections: [{ heading: "", text: "" }],
          productIds: [],
        }}
      />
    </section>
  );
}
