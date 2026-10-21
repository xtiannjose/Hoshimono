import { db, inTransaction, type Client } from "@/lib/db";
import { productName } from "@/lib/product-name";
import { scaledCount } from "@/lib/servings";
import { isUuid } from "@/lib/uuid";
import { getProductSummaries, type ProductSummary } from "@/modules/catalog";

import {
  filled,
  MAX_TEXT,
  MAX_TITLE,
  publishedAt,
  refused,
  uniqueSlug,
  wholeIn,
  type ContentStatus,
  type FieldErrors,
  type SaveResult,
} from "./shared";

// Recipes (ADR 0013). shortcut: ingredient names come through the Product
// relation; prices and photos through catalog's summaries.

export type IngredientInput = {
  /** A Product to buy, or null for plain text ("Water"). */
  productId: string | null;
  label: string;
  note: string;
  /** How many to buy for the Recipe's base servings. */
  quantity: number;
  scales: boolean;
  optional: boolean;
};

export type RecipeInput = {
  title: string;
  intro: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  steps: string[];
  ingredients: IngredientInput[];
  status: ContentStatus;
  featured: boolean;
};

export type IngredientView = {
  id: string;
  /** The label if one was typed, else the Product's name. */
  name: string;
  note: string;
  quantity: number;
  scales: boolean;
  optional: boolean;
  /** Null for plain text, or a Product no longer sold. */
  product: ProductSummary | null;
  /** The Product chosen, sold or not (null for plain text). */
  productId: string | null;
};

export type RecipeSummary = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  photoUrl: string | null;
  photoAlt: string;
  servings: number;
  minutes: number;
};

export type RecipeView = RecipeSummary & {
  prepMinutes: number;
  cookMinutes: number;
  steps: string[];
  publishedAt: Date | null;
  updatedAt: Date;
  ingredients: IngredientView[];
};

const summarySelect = {
  id: true,
  slug: true,
  title: true,
  intro: true,
  photoUrl: true,
  photoAlt: true,
  servings: true,
  prepMinutes: true,
  cookMinutes: true,
} as const;

const toSummary = (r: {
  id: string;
  slug: string;
  title: string;
  intro: string;
  photoUrl: string | null;
  photoAlt: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
}): RecipeSummary => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  intro: r.intro,
  photoUrl: r.photoUrl,
  photoAlt: r.photoAlt,
  servings: r.servings,
  minutes: r.prepMinutes + r.cookMinutes,
});

/** Count to buy for `servings` (ADR 0013). */
export const ingredientCount = scaledCount;

async function loadRecipe(where: { slug: string } | { id: string }) {
  const recipe = await db.recipe.findUnique({
    where,
    select: {
      ...summarySelect,
      steps: true,
      status: true,
      featured: true,
      publishedAt: true,
      updatedAt: true,
      ingredients: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          productId: true,
          label: true,
          note: true,
          quantity: true,
          scales: true,
          optional: true,
          product: { select: { name: true, brand: true } },
        },
      },
    },
  });
  if (!recipe) return null;
  const products = new Map(
    (
      await getProductSummaries(
        recipe.ingredients.flatMap((i) => i.productId ?? [])
      )
    ).map((p) => [p.id, p])
  );
  const view: RecipeView & { status: ContentStatus; featured: boolean } = {
    ...toSummary(recipe),
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    steps: recipe.steps,
    publishedAt: recipe.publishedAt,
    updatedAt: recipe.updatedAt,
    status: recipe.status,
    featured: recipe.featured,
    ingredients: recipe.ingredients.map((i) => ({
      id: i.id,
      name: i.label || (i.product ? productName(i.product) : ""),
      note: i.note,
      quantity: i.quantity,
      scales: i.scales,
      optional: i.optional,
      product: (i.productId && products.get(i.productId)) || null,
      productId: i.productId,
    })),
  };
  return view;
}

/** A published Recipe by its slug, or null. */
export async function getRecipe(slug: string): Promise<RecipeView | null> {
  const recipe = await loadRecipe({ slug });
  return recipe?.status === "published" ? recipe : null;
}

/** Published Recipes, newest first. */
export async function listRecipes(): Promise<RecipeSummary[]> {
  const rows = await db.recipe.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    select: summarySelect,
  });
  return rows.map(toSummary);
}

/** The Recipe on Home: the newest featured one, published. */
export async function getFeaturedRecipe(): Promise<RecipeView | null> {
  const row = await db.recipe.findFirst({
    where: { status: "published", featured: true },
    orderBy: { updatedAt: "desc" },
    select: { slug: true },
  });
  return row ? getRecipe(row.slug) : null;
}

// ---------- Content Editor ----------

export type AdminRecipeRow = RecipeSummary & {
  status: ContentStatus;
  featured: boolean;
  updatedAt: Date;
};

export async function listRecipesForAdmin(): Promise<AdminRecipeRow[]> {
  const rows = await db.recipe.findMany({
    orderBy: { updatedAt: "desc" },
    select: { ...summarySelect, status: true, featured: true, updatedAt: true },
  });
  return rows.map((r) => ({
    ...toSummary(r),
    status: r.status,
    featured: r.featured,
    updatedAt: r.updatedAt,
  }));
}

/** Any Recipe, draft or published, for its editor. */
export async function getRecipeForAdmin(id: string) {
  return isUuid(id) ? loadRecipe({ id }) : null;
}

const MINUTES = "Enter minutes as a whole number, 0 or more.";

function check(input: RecipeInput): {
  errors: FieldErrors;
  steps: string[];
  ingredients: IngredientInput[];
} {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = "Give the Recipe a title.";
  else if (title.length > MAX_TITLE)
    errors.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (input.intro.length > MAX_TEXT)
    errors.intro = `Keep the intro under ${MAX_TEXT} characters.`;
  if (!wholeIn(input.servings, 1, 50))
    errors.servings = "Servings must be a whole number from 1 to 50.";
  if (!wholeIn(input.prepMinutes, 0, 1440)) errors.prepMinutes = MINUTES;
  if (!wholeIn(input.cookMinutes, 0, 1440)) errors.cookMinutes = MINUTES;

  const steps = filled(input.steps);
  if (steps.some((s) => s.length > MAX_TEXT))
    errors.steps = `Keep each step under ${MAX_TEXT} characters.`;

  const ingredients = input.ingredients.map((i) => ({
    ...i,
    label: i.label.trim(),
    note: i.note.trim(),
  }));
  const bad = ingredients.findIndex(
    (i) =>
      (i.productId === null && !i.label) ||
      (i.productId !== null && !isUuid(i.productId))
  );
  const badCount = ingredients.findIndex((i) => !wholeIn(i.quantity, 1, 99));
  const tooLong = ingredients.findIndex(
    (i) => i.label.length > MAX_TITLE || i.note.length > MAX_TITLE
  );
  if (bad >= 0)
    errors.ingredients = `Ingredient ${bad + 1}: choose a Product or type a name.`;
  else if (badCount >= 0)
    errors.ingredients = `Ingredient ${badCount + 1}: buy 1 to 99.`;
  else if (tooLong >= 0)
    errors.ingredients = `Ingredient ${tooLong + 1}: keep the name and note under ${MAX_TITLE} characters.`;

  if (
    input.status === "published" &&
    (steps.length === 0 || ingredients.length === 0)
  ) {
    errors.status =
      "Add at least one ingredient and one step before publishing.";
  }
  return { errors, steps, ingredients };
}

/**
 * Create (no `id`) or update a Recipe with its ingredients. The slug is made
 * from the title on create and kept after. A form result (ADR 0009).
 */
export async function saveRecipe(
  input: RecipeInput,
  id?: string,
  client: Client = db
): Promise<SaveResult> {
  const { errors, steps, ingredients } = check(input);
  if (Object.keys(errors).length) return { ok: false, errors };
  return inTransaction<SaveResult>(client, async (tx) => {
    const before = id
      ? await tx.recipe.findUnique({
          where: { id },
          select: { slug: true, publishedAt: true },
        })
      : null;
    if (id && !before) return refused("form", "That Recipe no longer exists.");
    const productIds = ingredients.flatMap((i) => i.productId ?? []);
    const known = await tx.product.count({
      where: { id: { in: [...new Set(productIds)] } },
    });
    if (known !== new Set(productIds).size)
      return refused("ingredients", "One of the Products no longer exists.");

    const fields = {
      title: input.title.trim(),
      intro: input.intro.trim(),
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      steps,
      status: input.status,
      featured: input.featured,
      publishedAt: publishedAt(input.status, before?.publishedAt),
    };
    const slug =
      before?.slug ??
      (await uniqueSlug(fields.title, "recipe", async (base) =>
        (
          await tx.recipe.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
          })
        ).map((r) => r.slug)
      ));
    const saved = id
      ? await tx.recipe.update({ where: { id }, data: fields })
      : await tx.recipe.create({ data: { ...fields, slug } });
    await tx.recipeIngredient.deleteMany({ where: { recipeId: saved.id } });
    await tx.recipeIngredient.createMany({
      data: ingredients.map((i, position) => ({
        recipeId: saved.id,
        productId: i.productId,
        label: i.label || null,
        note: i.note,
        quantity: i.quantity,
        scales: i.scales,
        optional: i.optional,
        position,
      })),
    });
    return { ok: true, id: saved.id, slug };
  });
}

/** True when it was there to delete. */
export async function deleteRecipe(id: string, client: Client = db) {
  if (!isUuid(id)) return false;
  const { count } = await client.recipe.deleteMany({ where: { id } });
  return count > 0;
}
