import type { Metadata } from "next";
import Link from "next/link";

import { recipeList } from "@/app/_data/storefront";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentPhoto } from "@/components/recipe/content-photo";

export const metadata: Metadata = {
  title: "Recipes",
  description:
    "Filipino home cooking, with every ingredient ready to add to your cart in one tap.",
  alternates: { canonical: "/recipes" },
};

export default async function RecipesPage() {
  const recipes = await recipeList();
  return (
    <div className="wrap">
      <Breadcrumb items={[{ name: "Recipes", href: "/recipes" }]} />
      <div className="grid max-w-2xl gap-3 pt-2 pb-8">
        <h1 className="type-h1">Recipes</h1>
        <p className="type-lead">
          Pick one and add every ingredient to your cart in one tap.
        </p>
        <p>
          <Link
            href="/articles"
            className="decoration-border-strong inline-flex min-h-11 items-center font-semibold underline decoration-[1.5px] underline-offset-4 hover:decoration-current"
          >
            Tips and guides
          </Link>
        </p>
      </div>
      {recipes.length === 0 ? (
        <p className="rounded-card bg-muted px-6 py-10 text-center">
          No Recipes yet. Check back soon.
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r, i) => (
            <li key={r.id}>
              <Link href={`/recipes/${r.slug}`} className="group grid gap-3">
                <ContentPhoto
                  url={r.photoUrl}
                  alt={r.photoAlt}
                  kind="recipe"
                  priority={i < 3}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="rounded-card aspect-[4/3]"
                />
                <span className="grid gap-1">
                  <span className="type-h3 group-hover:underline">
                    {r.title}
                  </span>
                  <span className="text-muted-foreground line-clamp-2">
                    {r.intro}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {r.minutes > 0 && `${r.minutes} minutes, `}serves{" "}
                    {r.servings}
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
