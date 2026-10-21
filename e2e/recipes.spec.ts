import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { RUN } from "./run-tag";
import { signInAs } from "./sign-in";

// Batch 5.1 (ADR 0013): Recipes to the Cart in one tap, a Content Editor
// writing one without code, and Articles with Products to buy.
test.describe.configure({ timeout: 180_000 });

test("a guest picks servings, ticks what is not at home and adds a Recipe to the cart", async ({
  page,
}) => {
  await page.goto("/recipes/chicken-adobo", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Chicken Adobo" })
  ).toBeVisible();
  const panel = page.getByRole("complementary", { name: "Ingredients" });
  // Chicken, soy sauce and vinegar; garlic and the rest are usually at home.
  await expect(
    panel.getByRole("button", { name: "Add 3 items, ₱360.00" })
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // 8 servings: twice the chicken, the same bottles.
  for (let i = 0; i < 4; i++)
    await panel.getByRole("button", { name: "More servings" }).click();
  await expect(
    panel.getByRole("heading", { name: "Ingredients for 8" })
  ).toBeVisible();
  await panel.getByRole("checkbox", { name: /^Garlic/ }).check();
  const add = panel.getByRole("button", { name: "Add 5 items, ₱645.00" });
  await add.click();
  // The servings count is a status too: find the message by its words.
  await expect(panel.getByText("Added 5 items to your cart.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("button", { name: /^Cart: .* 5 items$/ })
  ).toBeVisible({ timeout: 30_000 });
});

test("a Content Editor writes a Recipe and publishes it; a sold-out ingredient offers a similar one", async ({
  browser,
}) => {
  const page = await signInAs(browser, "Content Editor");
  const menu = page.getByRole("navigation", { name: "Admin" });
  await expect(menu.getByRole("link", { name: "Recipes" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Products" })).toHaveCount(0);

  await page.goto("/admin/recipes/new", { waitUntil: "networkidle" });
  const title = `Ube Merienda ${RUN}`;
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("What (1)").fill("Ube Roll, 1 pc");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("What (2)").fill("Magnolia Fresh Milk, 1 L");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByLabel("What (3)").fill("Ice");
  await expect(page.getByText("From the catalogue")).toHaveCount(2);
  await expect(page.getByText("Not sold here: shown as text")).toBeVisible();
  await page
    .getByLabel("Step 1", { exact: true })
    .fill("Slice the roll. Serve with cold milk.");
  await page.getByLabel("Status").selectOption("published");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Create Recipe" }).click();
  await expect(
    page.getByText("Recipe created. Add a photo below.")
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("link", { name: "See it on the shop" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible({ timeout: 30_000 });
  const panel = page.getByRole("complementary", { name: "Ingredients" });
  await expect(panel.getByText("Sold out")).toBeVisible();
  await expect(panel.getByText("You will also need Ice.")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Add 1 item, ₱115.00" })
  ).toBeVisible();
  await panel.getByRole("checkbox", { name: /^Instead:/ }).check();
  await expect(
    panel.getByRole("button", { name: /^Add 2 items, / })
  ).toBeVisible();
});

test("an Article shows its sections and the Products to buy", async ({
  page,
}) => {
  await page.goto("/articles", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Stocking a Filipino pantry/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Stocking a Filipino pantry" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "The sour and the salty" })
  ).toBeVisible();
  const shop = page.getByRole("region", { name: "Shop this article" });
  await expect(shop.getByRole("listitem")).toHaveCount(7);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
