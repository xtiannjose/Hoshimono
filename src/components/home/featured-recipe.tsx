import { featuredRecipe } from "@/app/_data/storefront";
import { ContentPhoto } from "@/components/recipe/content-photo";
import { RecipeCart } from "@/components/recipe/recipe-cart";
import { recipeRows } from "@/components/recipe/recipe-rows";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The featured Recipe on Home (mockup-v2 #recipes, ADR 0013): photo beside
 * servings, ingredient ticks and one add button. Nothing when none is featured.
 */
export async function FeaturedRecipe() {
  const recipe = await featuredRecipe();
  if (!recipe) return null;
  const { rows, extras } = await recipeRows(recipe);
  return (
    <section aria-label="Recipe of the week" className="wrap pt-10">
      <div className="rounded-card border-border bg-card grid overflow-hidden border lg:grid-cols-2">
        <ContentPhoto
          url={recipe.photoUrl}
          alt={recipe.photoAlt}
          kind="recipe"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="aspect-[2/1] lg:aspect-auto lg:min-h-full"
        />
        <div className="p-6 md:px-9 md:py-8">
          <RecipeCart
            slug={recipe.slug}
            heading={recipe.title}
            baseServings={recipe.servings}
            minutes={recipe.prepMinutes + recipe.cookMinutes}
            rows={rows}
            extras={extras}
            more={{
              href: `/recipes/${recipe.slug}`,
              label: "See the full recipe",
            }}
          />
        </div>
      </div>
    </section>
  );
}

export function FeaturedRecipeSkeleton() {
  return (
    <div className="wrap pt-10">
      <Skeleton className="rounded-card h-[420px]" />
    </div>
  );
}
