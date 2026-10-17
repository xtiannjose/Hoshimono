import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getCategory,
  getCategoryTree,
  getProduct,
  listProducts,
  searchProducts,
  suggestSearch,
} from "@/modules/catalog";

import { productSlug, seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

// Catalogue reads (Batch 1.1) against the deterministic seed.
const db = createTestDb();

beforeAll(async () => {
  await resetDb(db);
  await seedDatabase(db, new Date("2026-10-18T20:00:00Z"));
  // Hidden Products: never listed, searched or shown.
  for (const status of ["draft", "archived"] as const) {
    await db.product.create({
      data: {
        slug: `hidden-${status}-milk`,
        name: `Hidden ${status} milk`,
        categoryId: seedId("category:milk"),
        packSizeValue: 1000,
        packSizeUnit: "ml",
        unitPriceBasis: "per_litre",
        priceCents: 100,
        taxClass: "vatable",
        status,
      },
    });
  }
  await db.product.update({
    where: { slug: "nestle-low-fat-milk" },
    data: { dietaryTags: ["low-fat"] },
  });
});
afterAll(() => db.$disconnect());

describe("getCategoryTree", () => {
  it("returns the browse tree in merchandising order", async () => {
    const tree = await getCategoryTree();
    expect(tree.map((c) => c.slug)).toEqual([
      "fruit-and-vegetables",
      "meat-and-fish",
      "dairy-and-eggs",
      "bakery",
      "frozen",
      "pantry",
      "drinks",
      "snacks",
      "household",
    ]);
    expect(tree[0].children.map((c) => c.slug)).toEqual([
      "fruit",
      "vegetables",
      "herbs-and-aromatics",
    ]);
    expect(tree.flatMap((c) => [c, ...c.children])).toHaveLength(41);
  });
});

describe("getCategory", () => {
  it("finds a Category by slug with its breadcrumb and children", async () => {
    const milk = await getCategory("milk");
    expect(milk).toMatchObject({
      slug: "milk",
      name: "Milk",
      ancestors: [{ slug: "dairy-and-eggs", name: "Dairy and eggs" }],
      children: [],
    });
    const dairy = await getCategory("dairy-and-eggs");
    expect(dairy?.ancestors).toEqual([]);
    expect(dairy?.children.map((c) => c.slug)).toEqual([
      "milk",
      "cheese-and-butter",
      "eggs",
      "yogurt",
    ]);
  });

  it("returns null for an unknown slug", async () => {
    expect(await getCategory("no-such-aisle")).toBeNull();
  });
});

const idOf = (brand: string | null, name: string) =>
  seedId(`product:${productSlug(brand, name)}`);

describe("getProduct", () => {
  it("returns the Product page data with breadcrumb and Unit Price", async () => {
    const milk = await getProduct(idOf("Magnolia", "Fresh Milk"));
    expect(milk).toMatchObject({
      slug: "magnolia-fresh-milk",
      name: "Fresh Milk",
      brand: "Magnolia",
      priceCents: 11500,
      compareAtCents: null,
      packSize: { value: 1000, unit: "ml" },
      unitPrice: { cents: 11500, basis: "per_litre" },
      isWeighed: false,
      storage: "chilled",
      category: { slug: "milk", name: "Milk" },
      breadcrumb: [
        { slug: "dairy-and-eggs", name: "Dairy and eggs" },
        { slug: "milk", name: "Milk" },
      ],
      images: [],
      primaryImage: null,
    });
  });

  it("normalises Unit Price per 100 g, per litre or per piece", async () => {
    // ₱42.00 for 360 ml is ₱116.67 per litre
    expect(
      (await getProduct(idOf("Alaska", "Evaporated Milk")))?.unitPrice
    ).toEqual({
      cents: 11667,
      basis: "per_litre",
    });
    // Weighed: ₱95.00 for about 1 kg is ₱9.50 per 100 g
    const bananas = await getProduct(idOf(null, "Lakatan Bananas"));
    expect(bananas?.unitPrice).toEqual({ cents: 950, basis: "per_100g" });
    expect(bananas?.isWeighed).toBe(true);
    // ₱165.00 for 4 is ₱41.25 each
    expect(
      (await getProduct(idOf(null, "Gala Apples, 4 pack")))?.unitPrice
    ).toEqual({
      cents: 4125,
      basis: "per_piece",
    });
  });

  it("returns null for hidden, unknown or malformed ids", async () => {
    const hidden = await db.product.findUniqueOrThrow({
      where: { slug: "hidden-draft-milk" },
    });
    expect(await getProduct(hidden.id)).toBeNull();
    expect(await getProduct("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(await getProduct("not-a-uuid")).toBeNull();
  });
});

describe("listProducts", () => {
  const names = (r: Awaited<ReturnType<typeof listProducts>>) =>
    r?.items.map((p) => p.name);

  it("lists a Category's active Products, including its sub-Categories", async () => {
    expect((await listProducts({ categorySlug: "milk" }))?.total).toBe(6);
    // Milk 6, Cheese and butter 4, Eggs 3, Yogurt 3
    expect(
      (await listProducts({ categorySlug: "dairy-and-eggs" }))?.total
    ).toBe(16);
    expect((await listProducts({}))?.total).toBe(155);
  });

  it("returns null for an unknown Category", async () => {
    expect(await listProducts({ categorySlug: "no-such-aisle" })).toBeNull();
  });

  it("filters by brand, price range and dietary tag", async () => {
    const alaska = await listProducts({
      categorySlug: "milk",
      brands: ["Alaska"],
    });
    expect(alaska?.total).toBe(3);
    expect(
      (await listProducts({ categorySlug: "milk", maxPriceCents: 10000 }))
        ?.total
    ).toBe(3);
    expect(
      (await listProducts({ categorySlug: "milk", minPriceCents: 10000 }))
        ?.total
    ).toBe(3);
    expect(
      names(
        await listProducts({ categorySlug: "milk", dietaryTags: ["low-fat"] })
      )
    ).toEqual(["Low Fat Milk"]);
  });

  it("sorts by price and by Unit Price", async () => {
    expect(
      names(await listProducts({ categorySlug: "rice", sort: "price_asc" }))
    ).toEqual([
      "Malagkit (Glutinous Rice)",
      "Brown Rice",
      "Jasmine Rice",
      "Dinorado Rice",
    ]);
    expect(
      names(
        await listProducts({ categorySlug: "rice", sort: "price_desc" })
      )?.[0]
    ).toBe("Dinorado Rice");
    // Per 100 g: Jasmine ₱6.80, Dinorado ₱7.30, Malagkit ₱9.50, Brown ₱9.75
    expect(
      names(
        await listProducts({ categorySlug: "rice", sort: "unit_price_asc" })
      )
    ).toEqual([
      "Jasmine Rice",
      "Dinorado Rice",
      "Malagkit (Glutinous Rice)",
      "Brown Rice",
    ]);
  });

  it("pages through results and caps the page size", async () => {
    const page = await listProducts({
      categorySlug: "milk",
      sort: "price_asc",
      limit: 2,
      offset: 2,
    });
    expect(names(page)).toEqual(["Full Cream Milk", "Low Fat Milk"]);
    expect(page?.total).toBe(6);
    expect((await listProducts({ limit: 1000 }))?.items).toHaveLength(96);
  });

  it("returns facets for the Category's filters", async () => {
    const milk = await listProducts({
      categorySlug: "milk",
      brands: ["Alaska"],
    });
    // Facets describe the whole Category, so other brands stay selectable.
    expect(milk?.facets).toEqual({
      brands: [
        { name: "Alaska", count: 3 },
        { name: "Bear Brand", count: 1 },
        { name: "Magnolia", count: 1 },
        { name: "Nestle", count: 1 },
      ],
      dietaryTags: [{ tag: "low-fat", count: 1 }],
      priceCents: { min: 4200, max: 15500 },
    });
  });
});

describe("searchProducts", () => {
  const search = (q: string, page?: { limit?: number; offset?: number }) =>
    searchProducts(q, page);
  const names = async (q: string) => (await search(q)).items.map((p) => p.name);

  it("finds Products by name, brand and Category", async () => {
    const milk = await search("milk");
    expect(milk.total).toBeGreaterThanOrEqual(6);
    expect(milk.items.map((p) => p.name)).toEqual(
      expect.arrayContaining([
        "Fresh Milk",
        "Full Cream Milk",
        "Evaporated Milk",
      ])
    );
    expect(milk.items.some((p) => p.name.startsWith("Hidden"))).toBe(false);
    expect(milk.correctedQuery).toBeNull();

    expect((await search("alaska")).items.map((p) => p.brand)).toEqual([
      "Alaska",
      "Alaska",
      "Alaska",
    ]);
    expect((await names("fresh milk"))[0]).toBe("Fresh Milk");
  });

  it("understands Filipino words (gatas is milk)", async () => {
    const gatas = await names("gatas");
    expect(gatas).toEqual(
      expect.arrayContaining(["Fresh Milk", "Full Cream Milk", "Low Fat Milk"])
    );
    expect(await names("itlog")).toEqual(
      expect.arrayContaining(["Large Eggs, 12 pack", "Salted Eggs, 6 pack"])
    );
  });

  it("matches part of a word or words typed together (trigram)", async () => {
    expect(await names("kong")).toContain("Kangkong");
    expect((await names("pancitcanton"))[0]).toBe("Pancit Canton Original");
  });

  it("matches as the Customer types", async () => {
    expect(await names("bana")).toEqual(
      expect.arrayContaining([
        "Lakatan Bananas",
        "Banana Chips",
        "Banana Ketchup",
      ])
    );
  });

  it("ranks name matches above Category-only matches", async () => {
    const frozen = await search("frozen");
    // Frozen: meat and seafood 5, ice cream 4, ready to cook 4
    expect(frozen.total).toBe(13);
    expect(frozen.items[0].name).toBe("Frozen Shrimp, Peeled");
    expect(frozen.items.map((p) => p.name)).toContain("Tocino");
  });

  it("corrects one typo and says what it searched for", async () => {
    const mlik = await search("mlik");
    expect(mlik.correctedQuery).toBe("milk");
    expect(mlik.items.map((p) => p.name)).toContain("Fresh Milk");

    const bananna = await search("bananna");
    expect(bananna.correctedQuery).toBe("banana");
    expect(bananna.total).toBeGreaterThan(0);

    expect((await search("fresh mlik")).correctedQuery).toBe("fresh milk");
  });

  it("returns an empty result, not an error, when nothing matches", async () => {
    for (const q of [
      "xylophone",
      "",
      "   ",
      "!!!",
      "'; drop table products;--",
    ]) {
      const result = await search(q);
      expect(result, q).toEqual({ items: [], total: 0, correctedQuery: null });
    }
    expect(await db.product.count()).toBe(157);
  });

  it("pages through results", async () => {
    const all = await search("milk", { limit: 96 });
    const second = await search("milk", { limit: 2, offset: 2 });
    expect(second.items.map((p) => p.id)).toEqual(
      all.items.slice(2, 4).map((p) => p.id)
    );
    expect(second.total).toBe(all.total);
  });
});

describe("suggestSearch", () => {
  it("suggests Products, brands and Categories while typing", async () => {
    const ala = await suggestSearch("ala");
    expect(ala.brands).toContain("Alaska");
    expect(ala.products.length).toBeGreaterThan(0);
    expect(ala.products.length).toBeLessThanOrEqual(5);

    expect(
      (await suggestSearch("gatas")).categories.map((c) => c.slug)
    ).toContain("milk");
    expect(
      (await suggestSearch("fru")).categories.map((c) => c.slug)
    ).toContain("fruit");
  });

  it("suggests nothing for an empty query", async () => {
    expect(await suggestSearch(" ")).toEqual({
      products: [],
      brands: [],
      categories: [],
    });
  });
});
