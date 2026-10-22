import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("a Category page lists, filters and keeps one canonical URL", async ({
  page,
}) => {
  await page.goto("/c/dairy-and-eggs/milk");
  await expect(
    page.getByRole("heading", { level: 1, name: "Milk" })
  ).toBeVisible();
  await expect(
    page.getByText("6 products").filter({ visible: true })
  ).toBeVisible();
  // The header marks the aisle the shopper is in.
  const aisles = page.getByRole("navigation", { name: "Categories" });
  await expect(
    aisles.getByRole("link", { name: "Dairy and eggs" })
  ).toHaveAttribute("aria-current", "page");
  await expect(aisles.locator('[aria-current="page"]')).toHaveCount(1);

  await page.goto("/c/dairy-and-eggs/milk?brand=Alaska");
  await expect(
    page.getByText("3 products").filter({ visible: true })
  ).toBeVisible();

  // A partial path redirects to the full one.
  await page.goto("/c/milk");
  await expect(page).toHaveURL(/\/c\/dairy-and-eggs\/milk$/);
});

test("a Product page shows price, Unit Price and redirects a stale slug", async ({
  page,
}) => {
  await page.goto("/c/dairy-and-eggs/milk");
  const link = page.getByRole("link", { name: /Fresh Milk/ }).first();
  const href = (await link.getAttribute("href")) ?? "";
  await link.click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Fresh Milk" })
  ).toBeVisible();
  await expect(page.getByText("₱115.00 per litre").first()).toBeVisible();

  // The buy box: choose how many, then add them in one go.
  await page.waitForLoadState("networkidle");
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  await stepper.getByRole("button", { name: "Add one" }).click();
  await expect(stepper.locator("output")).toHaveText("2");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByRole("main").getByRole("button", { name: "View cart" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(stepper.locator("output")).toHaveText("2");

  const id = href.slice(-36);
  await page.goto(`/p/old-name-${id}`);
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test("search finds Filipino words, corrects typos and guides on no results", async ({
  page,
}) => {
  await page.goto("/search?q=gatas");
  await expect(
    page.getByRole("link", { name: /Fresh Milk/ }).first()
  ).toBeVisible();

  await page.goto("/search?q=mlik");
  await expect(
    page.getByText("we searched for “milk”").filter({ visible: true })
  ).toBeVisible();

  await page.goto("/search?q=xylophone");
  await expect(
    page.getByRole("heading", { name: "No results for “xylophone”" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Pantry" }).last()).toBeVisible();
});

test("the header search suggests while typing and works by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const box = page.getByRole("combobox", { name: "Search groceries" });
  await box.fill("alas");
  const list = page.getByRole("listbox", { name: "Suggestions" });
  await expect(
    list.getByRole("option", { name: /Alaska/ }).first()
  ).toBeVisible();
  await box.press("ArrowDown");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/p\/alaska-/);
});

for (const scheme of ["light", "dark"] as const) {
  for (const path of [
    "/c/dairy-and-eggs/milk",
    "/search?q=milk",
    "/search?q=xylophone",
  ]) {
    test(`${path} has no axe violations in ${scheme} mode`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test(`a Product page has no axe violations in ${scheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/c/fruit-and-vegetables/fruit");
    await page
      .getByRole("link", { name: /Carabao Mangoes/ })
      .first()
      .click();
    // Next keeps the previous page mounted but hidden, so match by role.
    await expect(
      page.getByRole("heading", { level: 1, name: "Carabao Mangoes" })
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
