import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { recipe as loadRecipe, recipeList } from "@/app/_data/storefront";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContentPhoto } from "@/components/recipe/content-photo";
import { RecipeCart } from "@/components/recipe/recipe-cart";
import { recipeRows } from "@/components/recipe/recipe-rows";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecipeView } from "@/modules/content";

type Props = PageProps<"/[lang]/recipes/[slug]">;

// As on the Product page: a Recipe not prerendered renders on first visit.
export const instant = false;

export async function generateStaticParams() {
  const recipes = await recipeList();
  return recipes.length > 0
    ? recipes.map((r) => ({ slug: r.slug }))
    : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadRecipe((await params).slug);
  if (!found) return { title: "Recipe not found" };
  return {
    title: found.title,
    description: found.intro || `${found.title}, serves ${found.servings}.`,
    alternates: { canonical: `/recipes/${found.slug}` },
    ...(found.photoUrl && {
      openGraph: {
        type: "article",
        images: [{ url: found.photoUrl, alt: found.photoAlt }],
      },
    }),
  };
}

export default async function RecipePage({ params }: Props) {
  const found = await loadRecipe((await params).slug);
  return (
    <div className="wrap">
      {found ? (
        <RecipeArticle recipe={found} />
      ) : (
        <Suspense fallback={<Skeleton className="rounded-card mt-6 h-96" />}>
          <NotHere />
        </Suspense>
      )}
    </div>
  );
}

// shortcut: inside Suspense like the Product page's, so Next 16 can render
// the not-found page on demand.
function NotHere(): never {
  notFound();
}

const iso = (minutes: number) => `PT${minutes}M`;

async function RecipeArticle({ recipe }: { recipe: RecipeView }) {
  const { rows, extras } = await recipeRows(recipe);
  const minutes = recipe.prepMinutes + recipe.cookMinutes;
  const structured = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.intro,
    ...(recipe.photoUrl && { image: [recipe.photoUrl] }),
    recipeYield: `${recipe.servings} servings`,
    prepTime: iso(recipe.prepMinutes),
    cookTime: iso(recipe.cookMinutes),
    totalTime: iso(minutes),
    datePublished: recipe.publishedAt?.toISOString(),
    recipeIngredient: recipe.ingredients.map((i) =>
      i.note ? `${i.name}, ${i.note}` : i.name
    ),
    recipeInstructions: recipe.steps.map((text) => ({
      "@type": "HowToStep",
      text,
    })),
  };
  return (
    <>
      <script
        type="application/ld+json"
        // JSON from our own data; "<" escaped so text cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <Breadcrumb
        items={[
          { name: "Recipes", href: "/recipes" },
          { name: recipe.title, href: `/recipes/${recipe.slug}` },
        ]}
      />
      <article className="grid items-start gap-8 pt-2 lg:grid-cols-[7fr_5fr] lg:gap-10">
        <header className="grid gap-5 lg:col-start-1">
          <ContentPhoto
            url={recipe.photoUrl}
            alt={recipe.photoAlt}
            kind="recipe"
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="rounded-card aspect-[4/3]"
          />
          <h1 className="type-h1">{recipe.title}</h1>
          {recipe.intro && (
            <p className="type-lead max-w-[60ch]">{recipe.intro}</p>
          )}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {[
              ["Prep", recipe.prepMinutes],
              ["Cook", recipe.cookMinutes],
            ].map(([label, value]) =>
              Number(value) > 0 ? (
                <div key={label} className="grid">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold">{value} minutes</dd>
                </div>
              ) : null
            )}
            <div className="grid">
              <dt className="text-muted-foreground">Serves</dt>
              <dd className="font-semibold">{recipe.servings}</dd>
            </div>
          </dl>
        </header>

        <aside
          aria-label="Ingredients"
          className="rounded-card border-border bg-card border p-6 md:p-7 lg:sticky lg:top-[136px] lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <RecipeCart
            slug={recipe.slug}
            heading="Ingredients"
            baseServings={recipe.servings}
            minutes={minutes}
            rows={rows}
            extras={extras}
          />
        </aside>

        <section
          aria-labelledby="steps-h"
          className="grid gap-5 lg:col-start-1"
        >
          <h2 id="steps-h" className="type-h2">
            How to cook it
          </h2>
          <ol className="grid max-w-[65ch] gap-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <span
                  aria-hidden
                  className="bg-accent-soft rounded-pill grid size-9 place-items-center font-bold tabular-nums"
                >
                  {i + 1}
                </span>
                <p className="pt-1.5 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </>
  );
}
