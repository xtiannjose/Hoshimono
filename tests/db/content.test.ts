import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getCartQuantities,
  newGuestToken,
  type CartOwner,
} from "@/modules/cart";
import {
  addRecipeToCart,
  getArticle,
  getFeaturedRecipe,
  getRecipe,
  getRecipeForAdmin,
  ingredientCount,
  listRecipes,
  saveArticle,
  saveRecipe,
  type RecipeInput,
} from "@/modules/content";
import { getDefaultHubId } from "@/modules/delivery";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

const db = createTestDb();

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, new Date("2026-10-18T20:00:00Z"));
  // These tests write their own Recipes and Articles.
  await db.recipe.deleteMany();
  await db.article.deleteMany();
});
afterAll(() => db.$disconnect());

const product = (slug: string) => seedId(`product:${slug}`);
const guest = (): CartOwner => ({ guestToken: newGuestToken() });

const CHICKEN = product("magnolia-chicken-thighs");
const SOY = product("silver-swan-soy-sauce");
const GARLIC = product("garlic");
const SOLD_OUT = product("ube-roll");

const adobo = (over: Partial<RecipeInput> = {}): RecipeInput => ({
  title: "Chicken Adobo",
  intro: "The one everyone grew up with.",
  servings: 4,
  prepMinutes: 10,
  cookMinutes: 40,
  steps: ["Brown the chicken.", "", "Add soy sauce and vinegar, then simmer."],
  ingredients: [
    {
      productId: CHICKEN,
      label: "",
      note: "cut into pieces",
      quantity: 1,
      scales: true,
      optional: false,
    },
    {
      productId: SOY,
      label: "",
      note: "half a cup",
      quantity: 1,
      scales: false,
      optional: false,
    },
    {
      productId: GARLIC,
      label: "",
      note: "6 cloves, crushed",
      quantity: 1,
      scales: false,
      optional: true,
    },
    {
      productId: null,
      label: "Water",
      note: "1 cup",
      quantity: 1,
      scales: false,
      optional: false,
    },
  ],
  status: "published",
  featured: true,
  ...over,
});

describe("ingredientCount", () => {
  it("scales with servings and rounds up, unless the count is fixed", () => {
    const chicken = { quantity: 1, scales: true };
    expect(ingredientCount(chicken, 4, 4)).toBe(1);
    expect(ingredientCount(chicken, 6, 4)).toBe(2);
    expect(ingredientCount(chicken, 2, 4)).toBe(1);
    expect(ingredientCount({ quantity: 3, scales: true }, 8, 4)).toBe(6);
    expect(ingredientCount({ quantity: 1, scales: false }, 12, 4)).toBe(1);
  });
});

describe("saving a Recipe (ADR 0013)", () => {
  it("says what is missing, field by field", async () => {
    const result = await saveRecipe(
      adobo({
        title: " ",
        servings: 0,
        cookMinutes: -5,
        ingredients: [
          {
            productId: null,
            label: " ",
            note: "",
            quantity: 1,
            scales: true,
            optional: false,
          },
        ],
      })
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        title: "Give the Recipe a title.",
        servings: "Servings must be a whole number from 1 to 50.",
        cookMinutes: "Enter minutes as a whole number, 0 or more.",
        ingredients: "Ingredient 1: choose a Product or type a name.",
      },
    });
  });

  it("publishes only with an ingredient and a step; a Draft may be empty", async () => {
    expect(
      await saveRecipe(adobo({ title: "Empty", steps: [], ingredients: [] }))
    ).toEqual({
      ok: false,
      errors: {
        status: "Add at least one ingredient and one step before publishing.",
      },
    });
    const draft = await saveRecipe(
      adobo({ title: "Empty", steps: [], ingredients: [], status: "draft" })
    );
    expect(draft.ok).toBe(true);
  });

  it("makes the slug from the title once, unique, and drops blank steps", async () => {
    const first = await saveRecipe(adobo());
    const second = await saveRecipe(adobo());
    if (!first.ok || !second.ok) throw new Error("not saved");
    expect(first.slug).toBe("chicken-adobo");
    expect(second.slug).toBe("chicken-adobo-2");

    const renamed = await saveRecipe(
      adobo({ title: "Adobong Manok" }),
      second.id
    );
    expect(renamed).toEqual({
      ok: true,
      id: second.id,
      slug: "chicken-adobo-2",
    });
    const saved = await getRecipeForAdmin(second.id);
    expect(saved?.title).toBe("Adobong Manok");
    expect(saved?.steps).toEqual([
      "Brown the chicken.",
      "Add soy sauce and vinegar, then simmer.",
    ]);
    expect(saved?.ingredients.map((i) => i.note)).toEqual([
      "cut into pieces",
      "half a cup",
      "6 cloves, crushed",
      "1 cup",
    ]);
  });
});

describe("reading Recipes", () => {
  it("shows published Recipes only, with live Product prices", async () => {
    await saveRecipe(adobo({ title: "Secret Draft", status: "draft" }));
    expect(await getRecipe("secret-draft")).toBeNull();

    const recipe = await getRecipe("chicken-adobo");
    expect(recipe?.ingredients.map((i) => i.name)).toEqual([
      "Magnolia Chicken Thighs",
      "Silver Swan Soy Sauce",
      "Garlic",
      "Water",
    ]);
    expect(recipe?.ingredients[1].product?.priceCents).toBe(6500);
    expect(recipe?.ingredients[3].product).toBeNull();
    expect((await listRecipes()).map((r) => r.slug)).not.toContain(
      "secret-draft"
    );
  });

  it("features the newest featured, published Recipe", async () => {
    const latest = await saveRecipe(adobo({ title: "Sinigang na Baboy" }));
    if (!latest.ok) throw new Error("not saved");
    expect((await getFeaturedRecipe())?.slug).toBe("sinigang-na-baboy");
  });
});

describe("adding a Recipe to the Cart (ADR 0013)", () => {
  it("adds the ticked rows for the servings, on top of what is in the Cart", async () => {
    const hubId = await getDefaultHubId();
    const owner = guest();
    const recipe = (await getRecipe("chicken-adobo"))!;
    const [chicken, soy, garlic, water] = recipe.ingredients;
    const pick = (i: (typeof recipe.ingredients)[number]) => ({
      ingredientId: i.id,
      productId: i.product?.id ?? "",
    });

    const first = await addRecipeToCart(
      owner,
      { slug: "chicken-adobo", servings: 6, picks: [chicken, soy].map(pick) },
      hubId
    );
    expect(first).toEqual({ ok: true, added: 3, soldOut: [], capped: [] });
    expect(await getCartQuantities(owner)).toEqual({
      [CHICKEN]: 2,
      [SOY]: 1,
    });

    // Again, with the garlic; plain text rows are never bought.
    await addRecipeToCart(
      owner,
      {
        slug: "chicken-adobo",
        servings: 4,
        picks: [soy, garlic, water].map(pick),
      },
      hubId
    );
    expect(await getCartQuantities(owner)).toEqual({
      [CHICKEN]: 2,
      [SOY]: 2,
      [GARLIC]: 1,
    });
  });

  it("refuses a Product that is neither the ingredient nor a similar one", async () => {
    const hubId = await getDefaultHubId();
    const owner = guest();
    const recipe = (await getRecipe("chicken-adobo"))!;
    const result = await addRecipeToCart(
      owner,
      {
        slug: "chicken-adobo",
        servings: 4,
        picks: [
          { ingredientId: recipe.ingredients[0].id, productId: SOLD_OUT },
        ],
      },
      hubId
    );
    expect(result).toEqual({ ok: true, added: 0, soldOut: [], capped: [] });
    expect(await getCartQuantities(owner)).toEqual({});
  });

  it("names what is sold out and adds the rest", async () => {
    const hubId = await getDefaultHubId();
    const saved = await saveRecipe(
      adobo({
        title: "Ube Merienda",
        ingredients: [
          {
            productId: SOLD_OUT,
            label: "",
            note: "",
            quantity: 1,
            scales: false,
            optional: false,
          },
          {
            productId: SOY,
            label: "",
            note: "",
            quantity: 1,
            scales: false,
            optional: false,
          },
        ],
      })
    );
    if (!saved.ok) throw new Error("not saved");
    const recipe = (await getRecipe(saved.slug))!;
    const owner = guest();
    const result = await addRecipeToCart(
      owner,
      {
        slug: saved.slug,
        servings: 4,
        picks: recipe.ingredients.map((i) => ({
          ingredientId: i.id,
          productId: i.product!.id,
        })),
      },
      hubId
    );
    expect(result).toEqual({
      ok: true,
      added: 1,
      soldOut: ["Ube Roll"],
      capped: [],
    });
    expect(await getCartQuantities(owner)).toEqual({ [SOY]: 1 });
  });

  it("knows no unpublished Recipe", async () => {
    expect(
      await addRecipeToCart(
        guest(),
        { slug: "secret-draft", servings: 4, picks: [] },
        await getDefaultHubId()
      )
    ).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("Articles (ADR 0013)", () => {
  it("saves sections and linked Products, and shows only published ones", async () => {
    expect(
      await saveArticle({
        title: "",
        intro: "",
        sections: [],
        productIds: [],
        status: "published",
      })
    ).toEqual({
      ok: false,
      errors: {
        title: "Give the Article a title.",
        status: "Write at least one section before publishing.",
      },
    });

    const saved = await saveArticle({
      title: "Stocking a Filipino pantry",
      intro: "Five bottles and a sack of rice go a long way.",
      sections: [
        { heading: "Start with the sour and the salty", text: "Soy sauce..." },
        { heading: "", text: " " },
        { heading: "", text: "Then rice." },
      ],
      productIds: [SOY, GARLIC, SOY],
      status: "published",
    });
    if (!saved.ok) throw new Error("not saved");
    const article = await getArticle(saved.slug);
    expect(article?.sections).toEqual([
      { heading: "Start with the sour and the salty", text: "Soy sauce..." },
      { heading: "", text: "Then rice." },
    ]);
    expect(article?.products.map((p) => p.id)).toEqual([SOY, GARLIC]);

    const draft = await saveArticle(
      {
        title: "Unfinished",
        intro: "",
        sections: [],
        productIds: [],
        status: "draft",
      },
      undefined
    );
    if (!draft.ok) throw new Error("not saved");
    expect(await getArticle(draft.slug)).toBeNull();
  });
});
