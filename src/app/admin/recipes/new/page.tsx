import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { productChoices } from "../../content/choices";
import { AdminSkeleton, StaffGate } from "../../staff-gate";
import { RecipeEditor } from "../recipe-editor";

export const metadata: Metadata = { title: "New Recipe" };

export default function NewRecipePage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StaffGate next="/admin/recipes/new" area="content">
        <NewRecipe />
      </StaffGate>
    </Suspense>
  );
}

async function NewRecipe() {
  return (
    <section className="grid gap-5">
      <div className="grid gap-1">
        <Link
          href="/admin/recipes"
          className="text-muted-foreground text-sm hover:underline"
        >
          All Recipes
        </Link>
        <h1 className="type-h2">New Recipe</h1>
        <p className="text-muted-foreground">
          Saved as a Draft until you publish it. Add the photo after the first
          save.
        </p>
      </div>
      <RecipeEditor
        id={null}
        products={await productChoices()}
        recipe={{
          title: "",
          intro: "",
          servings: 4,
          prepMinutes: 0,
          cookMinutes: 0,
          status: "draft",
          featured: false,
          steps: [""],
          ingredients: [],
        }}
      />
    </section>
  );
}
