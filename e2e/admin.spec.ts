import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { signIn } from "./sign-in";

// Phase 1 exit criterion: a non-developer imports a 500-row CSV, edits a
// Product, and sees the change on the storefront within a minute.
const MERCHANDISER = "merchandiser@hoshimono.test";

// One Staff email: a sign-in link is single-use, so these run one at a time.
// The dev server compiles admin routes and actions on first use, which is
// slow while other specs run, so these tests get two minutes each.
test.describe.configure({ mode: "serial", timeout: 120_000 });

test("a Merchandiser edits a Product and the shop shows it at once", async ({
  page,
}) => {
  await signIn(page, MERCHANDISER, "/admin/products");
  await page.goto("/admin/products?q=Banana+Ketchup");
  await page.getByRole("link", { name: "Banana Ketchup" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Banana Ketchup" })
  ).toBeVisible();

  const price = page.getByLabel("Price (₱)");
  await price.fill("not money");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter a price in pesos")).toBeVisible({
    timeout: 60_000, // the dev server compiles the action on first use
  });
  // The form keeps what was typed after an error.
  await expect(price).toHaveValue("not money");

  await price.fill("64.75");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.getByRole("link", { name: "View in shop" }).click();
  await expect(page.getByText("₱64.75").first()).toBeVisible();
});

test("a 500-row CSV imports and the Products appear in search", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const header =
    "name,brand,category,pack_size_value,pack_size_unit,price,compare_at_price,tax_class,is_weighed,storage,status,barcode,description,allergens,dietary_tags";
  const rows = Array.from(
    { length: 500 },
    (_, i) =>
      `Import Test Rice ${i + 1},E2E Mills,rice,1000,g,${(60 + (i % 40)).toFixed(2)},,vat_exempt,no,ambient,active,,,,`
  );
  await signIn(page, MERCHANDISER, "/admin/import");
  await page.goto("/admin/import", { waitUntil: "networkidle" });
  await page.getByLabel("CSV file").setInputFiles({
    name: "products.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([header, ...rows].join("\n")),
  });
  await page.getByRole("button", { name: "Import Products" }).click();
  await expect(page.getByRole("status")).toContainText("500 new", {
    timeout: 60_000,
  });

  await page.goto("/search?q=Import+Test+Rice+250");
  await expect(
    page.getByRole("link", { name: /Import Test Rice 250/ }).first()
  ).toBeVisible();
});

test("a bad CSV shows a report and saves nothing", async ({ page }) => {
  await signIn(page, MERCHANDISER, "/admin/import");
  await page.goto("/admin/import", { waitUntil: "networkidle" });
  await page.getByLabel("CSV file").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,category,pack_size_value,pack_size_unit,price,tax_class\nBad,rice,1,pc,abc,vatable\n"
    ),
  });
  await page.getByRole("button", { name: "Import Products" }).click();
  // Next also renders a route announcer with role "alert".
  const report = page
    .getByRole("alert")
    .filter({ hasText: "Nothing was imported" });
  await expect(report).toContainText("Nothing was imported");
  await expect(report.getByRole("row", { name: /2 price/ })).toBeVisible();
});

test("the export downloads every Product as CSV", async ({ page }) => {
  await signIn(page, MERCHANDISER, "/admin/import");
  const res = await page.request.get("/admin/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect((await res.text()).split("\r\n")[0]).toContain(
    "slug,name,brand,category"
  );
});

test("a Merchandiser adds a Category", async ({ page }) => {
  await signIn(page, MERCHANDISER, "/admin/categories");
  await page.goto("/admin/categories");
  await page.getByLabel("New Category name").fill("Baby Food");
  await page.getByLabel("Under").selectOption({ label: "Pantry" });
  await page.getByRole("button", { name: "Add Category" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Category added" })
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Name of Baby Food" })
  ).toBeVisible();
});

test("Customers cannot open the admin", async ({ page }) => {
  await signIn(page, "ligaya@example.com", "/account");
  const res = await page.goto("/admin/products");
  await expect(
    page.getByRole("heading", { name: "We could not find that page" })
  ).toBeVisible();
  expect(res?.status()).toBe(200); // streamed 404: see the Phase 1 report
  const csv = await page.request.get("/admin/export");
  expect(csv.status()).toBe(404);
});

test("the admin Products list has no axe violations", async ({ page }) => {
  await signIn(page, MERCHANDISER, "/admin/products");
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(results.violations).toEqual([]);
});
