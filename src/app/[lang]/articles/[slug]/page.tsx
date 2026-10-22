import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  article as loadArticle,
  articleList,
  stockStates,
} from "@/app/_data/storefront";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProductGrid } from "@/components/product/product-grid";
import { ContentPhoto } from "@/components/recipe/content-photo";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArticleView } from "@/modules/content";

type Props = PageProps<"/[lang]/articles/[slug]">;

export const instant = false;

export async function generateStaticParams() {
  const articles = await articleList();
  return articles.length > 0
    ? articles.map((a) => ({ slug: a.slug }))
    : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadArticle((await params).slug);
  if (!found) return { title: "Article not found" };
  return {
    title: found.title,
    description: found.intro || undefined,
    alternates: { canonical: `/articles/${found.slug}` },
    ...(found.photoUrl && {
      openGraph: {
        type: "article",
        images: [{ url: found.photoUrl, alt: found.photoAlt }],
      },
    }),
  };
}

export default async function ArticlePage({ params }: Props) {
  const found = await loadArticle((await params).slug);
  return (
    <div className="wrap">
      {found ? (
        <ArticleBody article={found} />
      ) : (
        <Suspense fallback={<Skeleton className="rounded-card mt-6 h-96" />}>
          <NotHere />
        </Suspense>
      )}
    </div>
  );
}

function NotHere(): never {
  notFound();
}

/** Paragraphs are separated by a blank line in the editor. */
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

async function ArticleBody({ article }: { article: ArticleView }) {
  const stock = await stockStates(article.products.map((p) => p.id));
  return (
    <>
      <Breadcrumb
        items={[
          { name: "Tips and guides", href: "/articles" },
          { name: article.title, href: `/articles/${article.slug}` },
        ]}
      />
      <article className="grid gap-8 pt-2">
        <header className="grid max-w-3xl gap-4">
          <h1 className="type-h1">{article.title}</h1>
          {article.intro && <p className="type-lead">{article.intro}</p>}
        </header>
        {article.photoUrl && (
          <ContentPhoto
            url={article.photoUrl}
            alt={article.photoAlt}
            kind="article"
            priority
            sizes="(min-width: 1024px) 66vw, 100vw"
            className="rounded-card aspect-[16/9] max-w-4xl"
          />
        )}
        <div className="grid max-w-[65ch] gap-8">
          {article.sections.map((s, i) => (
            <section key={i} className="grid gap-3">
              {s.heading && <h2 className="type-h2">{s.heading}</h2>}
              {paragraphs(s.text).map((p, j) => (
                <p key={j} className="leading-relaxed">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
      {article.products.length > 0 && (
        <section aria-labelledby="shop-h" className="pt-14">
          <h2 id="shop-h" className="type-h2 mb-5">
            Shop this article
          </h2>
          <ProductGrid products={article.products} stock={stock} empty={null} />
        </section>
      )}
    </>
  );
}
