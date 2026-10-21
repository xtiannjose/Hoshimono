import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getArticleForAdmin } from "@/modules/content";

import { productChoices } from "../../content/choices";
import { DeleteButton } from "../../content/delete-button";
import { PhotoForm } from "../../content/photo-form";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { ArticleEditor } from "../article-editor";

export const metadata: Metadata = { title: "Edit Article" };

type Props = PageProps<"/admin/articles/[id]">;

export default function EditArticlePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/articles" area="content">
        <EditArticle params={params} searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

async function EditArticle({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const [article, products] = await Promise.all([
    getArticleForAdmin(id),
    productChoices(),
  ]);
  if (!article) notFound();
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <Link
          href="/admin/articles"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Articles
        </Link>
        <h1 className="type-h2">{article.title}</h1>
        <p className="flex flex-wrap gap-x-4">
          <span>{article.status === "published" ? "Published" : "Draft"}</span>
          {article.status === "published" && (
            <Link
              href={`/articles/${article.slug}`}
              className="font-semibold hover:underline"
            >
              See it on the shop
            </Link>
          )}
        </p>
        {created && (
          <p role="status" className="font-semibold">
            Article created. Add a photo below.
          </p>
        )}
      </div>
      <PhotoForm
        kind="article"
        id={article.id}
        photo={
          article.photoUrl
            ? { url: article.photoUrl, alt: article.photoAlt }
            : null
        }
      />
      <ArticleEditor
        id={article.id}
        products={products}
        article={{
          title: article.title,
          intro: article.intro,
          status: article.status,
          sections: article.sections.length
            ? article.sections
            : [{ heading: "", text: "" }],
          productIds: article.productIds,
        }}
      />
      <DeleteButton kind="article" id={article.id} title={article.title} />
    </section>
  );
}
