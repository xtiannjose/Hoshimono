import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getRecipeForAdmin } from "@/modules/content";

import { productChoices } from "../../content/choices";
import { DeleteButton } from "../../content/delete-button";
import { PhotoForm } from "../../content/photo-form";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { RecipeEditor } from "../recipe-editor";

export const metadata: Metadata = { title: "Edit Recipe" };

type Props = PageProps<"/admin/recipes/[id]">;

export default function EditRecipePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/recipes" area="content">
        <EditRecipe params={params} searchParams={searchParams} />
      </StaffGate>
    </Suspense>
  );
}

async function EditRecipe({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: Props["searchParams"];
}) {
  const { id } = await params;
  const created = (await searchParams).created === "1";
  const [recipe, products] = await Promise.all([
    getRecipeForAdmin(id),
    productChoices(),
  ]);
  if (!recipe) notFound();
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <Link
          href="/admin/recipes"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Recipes
        </Link>
        <h1 className="type-h2">{recipe.title}</h1>
        <p className="flex flex-wrap gap-x-4">
          <span>
            {recipe.status === "published" ? "Published" : "Draft"}
            {recipe.featured && recipe.status === "published" && ", on Home"}
          </span>
          {recipe.status === "published" && (
            <Link
              href={`/recipes/${recipe.slug}`}
              className="font-semibold hover:underline"
            >
              See it on the shop
            </Link>
          )}
        </p>
        {created && (
          <p role="status" className="font-semibold">
            Recipe created. Add a photo below.
          </p>
        )}
      </div>
      <PhotoForm
        kind="recipe"
        id={recipe.id}
        photo={
          recipe.photoUrl
            ? { url: recipe.photoUrl, alt: recipe.photoAlt }
            : null
        }
      />
      <RecipeEditor
        id={recipe.id}
        products={products}
        recipe={{
          title: recipe.title,
          intro: recipe.intro,
          servings: recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          status: recipe.status,
          featured: recipe.featured,
          steps: recipe.steps.length ? recipe.steps : [""],
          ingredients: recipe.ingredients.map((i) => ({
            productId: i.productId,
            label: i.name,
            note: i.note,
            quantity: i.quantity,
            scales: i.scales,
            optional: i.optional,
          })),
        }}
      />
      <DeleteButton kind="recipe" id={recipe.id} title={recipe.title} />
    </section>
  );
}
