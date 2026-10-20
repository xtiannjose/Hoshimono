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

test("home shows the Category mosaic and fresh picks", async ({ page }) => {
  await page.goto("/");
  const mosaic = page.getByRole("region", { name: "Shop by category" });
  await expect(mosaic.getByRole("link")).toHaveCount(8);
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
