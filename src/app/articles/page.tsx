import type { Metadata } from "next";
import Link from "next/link";

import { articleList } from "@/app/_data/storefront";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentPhoto } from "@/components/recipe/content-photo";

export const metadata: Metadata = {
  title: "Tips and guides",
  description:
    "How to shop, store and cook well, from the people who pack your groceries.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await articleList();
  return (
    <div className="wrap">
      <Breadcrumb items={[{ name: "Tips and guides", href: "/articles" }]} />
      <div className="grid max-w-2xl gap-3 pt-2 pb-8">
        <h1 className="type-h1">Tips and guides</h1>
        <p className="type-lead">
          How to shop, store and cook well, with the groceries to match.
        </p>
      </div>
      {articles.length === 0 ? (
        <p className="rounded-card bg-muted px-6 py-10 text-center">
          Nothing here yet. In the meantime,{" "}
          <Link href="/recipes" className="font-semibold underline">
            see the Recipes
          </Link>
          .
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
          {articles.map((a, i) => (
            <li key={a.id}>
              <Link href={`/articles/${a.slug}`} className="group grid gap-3">
                <ContentPhoto
                  url={a.photoUrl}
                  alt={a.photoAlt}
                  kind="article"
                  priority={i < 2}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="rounded-card aspect-[16/9]"
                />
                <span className="grid gap-1">
                  <span className="type-h3 group-hover:underline">
                    {a.title}
                  </span>
                  <span className="text-muted-foreground line-clamp-2">
                    {a.intro}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
