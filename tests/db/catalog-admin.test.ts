import { rm } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  addProductImage,
  createCategory,
  deleteCategory,
  exportProductsCsv,
  importProductsCsv,
  updateCategory,
  updateProduct,
} from "@/modules/catalog";
import { parseCsv } from "@/lib/csv";

import { seedDatabase, seedId } from "../../prisma/seed-data";
import { createTestDb, resetDb } from "./helpers";

// Admin catalogue writes (Batch 1.4, PRD ADM-1 and ADM-2).
const db = createTestDb();
const MEDIA = path.join(process.cwd(), "public", "media", "test");
process.env.MEDIA_LOCAL_DIR = MEDIA;

beforeEach(async () => {
  await resetDb(db);
  await seedDatabase(db, new Date("2026-10-18T20:00:00Z"));
});
afterAll(async () => {
  await db.$disconnect();
  await rm(MEDIA, { recursive: true, force: true });
});

const HEADER =
  "name,brand,category,pack_size_value,pack_size_unit,price,compare_at_price,tax_class,is_weighed,storage,status,barcode,description,allergens,dietary_tags";

describe("importProductsCsv", () => {
  it("creates new Products and updates existing ones by slug", async () => {
    const csv = [
      HEADER,
      "Coconut Vinegar,Datu Puti,sauces-and-condiments,1000,ml,59.50,,vatable,no,ambient,active,,Sukang niyog,,vegan",
      // Same brand and name as the seeded Product: an update, not a duplicate.
      "Fresh Milk,Magnolia,milk,1000,ml,119.00,125.00,vatable,no,chilled,active,,,milk,",
    ].join("\n");
    const result = await importProductsCsv(csv);
    expect(result).toEqual({ ok: true, created: 1, updated: 1 });

    const vinegar = await db.product.findUniqueOrThrow({
      where: { slug: "datu-puti-coconut-vinegar" },
    });
    expect(vinegar).toMatchObject({
      priceCents: 5950,
      unitPriceBasis: "per_litre",
      dietaryTags: ["vegan"],
      status: "active",
    });
    const milk = await db.product.findUniqueOrThrow({
      where: { slug: "magnolia-fresh-milk" },
    });
    expect(milk).toMatchObject({
      priceCents: 11900,
      compareAtCents: 12500,
      allergens: ["milk"],
    });
  });

  it("applies nothing when any row is wrong, and says which row and why", async () => {
    const before = await db.product.count();
    const csv = [
      HEADER,
      "Good Rice,,rice,5000,g,340.00,,vat_exempt,no,ambient,active,,,,",
      "Bad Price,,rice,5000,g,abc,,vat_exempt,no,ambient,active,,,,",
      "No Aisle,,no-such-aisle,1,pc,10.00,,vatable,no,ambient,active,,,,",
      "Cheaper Than Sale,,rice,1,pc,10.00,9.00,vatable,no,ambient,active,,,,",
    ].join("\n");
    const result = await importProductsCsv(csv);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 3, field: "price" }),
        expect.objectContaining({ row: 4, field: "category" }),
        expect.objectContaining({ row: 5, field: "compare_at_price" }),
      ])
    );
    expect(result.errors.some((e) => e.row === 2)).toBe(false);
    expect(await db.product.count()).toBe(before);
  });

  it("rejects missing or unknown columns and duplicate rows", async () => {
    const missing = await importProductsCsv("name,price\nMilk,10");
    expect(missing.ok).toBe(false);

    const duplicate = await importProductsCsv(
      [
        HEADER,
        "Twin,,rice,1,pc,10.00,,vatable,no,ambient,active,,,,",
        "Twin,,rice,1,pc,11.00,,vatable,no,ambient,active,,,,",
      ].join("\n")
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.errors[0]).toMatchObject({ row: 3, field: "name" });
    }
  });

  it("round-trips: importing an export changes nothing", async () => {
    const before = await db.product.findMany({ orderBy: { slug: "asc" } });
    const csv = await exportProductsCsv();
    expect(parseCsv(csv)).toHaveLength(before.length + 1);
    const result = await importProductsCsv(csv);
    expect(result).toEqual({ ok: true, created: 0, updated: before.length });
    const after = await db.product.findMany({ orderBy: { slug: "asc" } });
    expect(after.map((p) => [p.slug, p.priceCents, p.status])).toEqual(
      before.map((p) => [p.slug, p.priceCents, p.status])
    );
  });
});

describe("updateProduct", () => {
  it("saves an edit and refuses a compare-at price below the price", async () => {
    const id = seedId("product:magnolia-fresh-milk");
    const ok = await updateProduct(id, { priceCents: 12000, status: "active" });
    expect(ok.ok).toBe(true);
    const bad = await updateProduct(id, { compareAtCents: 100 });
    expect(bad.ok).toBe(false);
    const row = await db.product.findUniqueOrThrow({ where: { id } });
    expect(row.priceCents).toBe(12000);
    expect(row.compareAtCents).toBeNull();
  });
});

describe("Category editor", () => {
  it("creates a Category under a parent", async () => {
    const result = await createCategory({
      name: "Instant Noodles",
      parentSlug: "pantry",
    });
    expect(result.ok).toBe(true);
    const row = await db.category.findUniqueOrThrow({
      where: { slug: "instant-noodles" },
    });
    expect(row.parentId).toBe(seedId("category:pantry"));
  });

  it("refuses a move that would make a cycle or go deeper than 3 levels", async () => {
    const pantry = seedId("category:pantry");
    const rice = seedId("category:rice");
    expect((await updateCategory(pantry, { parentId: rice })).ok).toBe(false);

    const level3 = await createCategory({
      name: "Brown Rice Varieties",
      parentSlug: "rice",
    });
    expect(level3.ok).toBe(true);
    const level4 = await createCategory({
      name: "Too Deep",
      parentSlug: "brown-rice-varieties",
    });
    expect(level4.ok).toBe(false);
  });

  it("refuses to delete a Category that still has Products or children", async () => {
    expect((await deleteCategory(seedId("category:rice"))).ok).toBe(false);
    expect((await deleteCategory(seedId("category:pantry"))).ok).toBe(false);
    const empty = await createCategory({
      name: "Seasonal",
      parentSlug: "pantry",
    });
    expect(empty.ok).toBe(true);
    const id = (
      await db.category.findUniqueOrThrow({ where: { slug: "seasonal" } })
    ).id;
    expect((await deleteCategory(id)).ok).toBe(true);
  });
});

describe("addProductImage", () => {
  const productId = seedId("product:magnolia-fresh-milk");
  const png = (size: number) =>
    sharp({
      create: { width: size, height: size, channels: 3, background: "#cde" },
    })
      .png()
      .toBuffer();

  it("stores a square WebP master and makes the first image primary", async () => {
    const result = await addProductImage(productId, {
      bytes: await png(1200),
      alt: "Magnolia Fresh Milk carton",
    });
    expect(result.ok).toBe(true);
    const image = await db.productImage.findFirstOrThrow({
      where: { productId },
    });
    expect(image.isPrimary).toBe(true);
    expect(image.url).toMatch(/\.webp$/);
  });

  it("refuses small images and files that are not images", async () => {
    const small = await addProductImage(productId, {
      bytes: await png(500),
      alt: "",
    });
    expect(small.ok).toBe(false);
    const junk = await addProductImage(productId, {
      bytes: Buffer.from("not an image"),
      alt: "",
    });
    expect(junk.ok).toBe(false);
    expect(await db.productImage.count({ where: { productId } })).toBe(0);
  });
});
