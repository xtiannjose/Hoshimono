import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Hoshimono/);
  // Placeholders are decoration until real photos arrive: nothing to read out.
  await expect(page.getByRole("img", { name: /Photo to come/ })).toHaveCount(0);
  // Not inside a shop aisle, so no Category is marked.
  await expect(
    page
      .getByRole("navigation", { name: "Categories" })
      .locator('[aria-current="page"]')
  ).toHaveCount(0);
});

test("home opens on the shop: delivery, Categories and fresh picks", async ({
  page,
}) => {
  await page.goto("/");
  // No hero (ADR 0018): where we deliver, then every Category and Recipes.
  await expect(page.getByRole("region", { name: "Delivery" })).toContainText(
    "Same-day delivery"
  );
  await expect(
    page.getByRole("navigation", { name: "Shop by category" }).getByRole("link")
  ).toHaveCount(10);
  const picks = page.getByRole("region", { name: "Fresh picks today" });
  await expect(picks.getByRole("article")).toHaveCount(6);
});

test("Add becomes a stepper, keeps focus, and goes back at zero", async ({
  page,
}) => {
  await page.goto("/");
  const card = page
    .getByRole("region", { name: "Fresh picks today" })
    .getByRole("article")
    .first();
  const name = (await card.getByRole("link").last().innerText()).trim();

  await card.getByRole("button", { name: `Add ${name} to cart` }).click();
  const stepper = card.getByRole("group", { name: `Quantity of ${name}` });
  await expect(stepper).toBeVisible();
  const plus = stepper.getByRole("button", { name: "Add one" });
  await expect(plus).toBeFocused();
  await expect(page.locator("#live-region")).toHaveText(`${name}, 1 in cart`);

  await plus.click();
  await expect(stepper.locator("output")).toHaveText("2");

  const minus = stepper.getByRole("button", { name: "Remove one" });
  await minus.click();
  await minus.click();
  const add = card.getByRole("button", { name: `Add ${name} to cart` });
  await expect(add).toBeVisible();
  await expect(add).toBeFocused();
});

test("the footer leads to short answers on delivery and refunds", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Help" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Help" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Can I cancel an order?")).toBeVisible();
});
