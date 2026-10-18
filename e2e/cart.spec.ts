import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { freshEmail } from "./run-tag";
import { signIn } from "./sign-in";

// Slow first compiles of each route on the dev server.
test.describe.configure({ timeout: 90_000 });

const cartButton = (page: Page, items: number) =>
  page.getByRole("button", { name: new RegExp(`^Cart: .* ${items} items$`) });

async function addMilk(page: Page, quantity: number) {
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  for (let i = 1; i < quantity; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
  }
  await expect(cartButton(page, quantity)).toBeVisible();
}

test("a guest Cart survives a reload and shows in the drawer and Cart page", async ({
  page,
}) => {
  await addMilk(page, 2);

  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page
      .getByRole("group", { name: "Quantity of Fresh Milk" })
      .locator("output")
  ).toHaveText("2");

  await cartButton(page, 2).click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(
    drawer.getByRole("link", { name: "Magnolia Fresh Milk" })
  ).toBeVisible();
  await expect(drawer.getByText("₱230.00").first()).toBeVisible();
  await expect(drawer.getByText("At checkout", { exact: true })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations
  ).toEqual([]);

  await drawer.getByRole("link", { name: "See full cart" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cart" })
  ).toBeVisible();

  // Substitution Preference is saved per line.
  await page.getByRole("button", { name: /Pick a similar item/ }).click();
  await page.getByRole("radio", { name: /No substitute/ }).check();
  await expect(
    page.getByRole("button", { name: /^No substitute/ })
  ).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("button", { name: /^No substitute/ })
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page
    .getByRole("button", { name: "Remove Magnolia Fresh Milk" })
    .click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("signing in moves the guest Cart into the account", async ({ page }) => {
  await addMilk(page, 3);
  await signIn(page, freshEmail("cart-merge"), "/cart");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole("link", { name: "Magnolia Fresh Milk" })
  ).toBeVisible();
  await expect(cartButton(page, 3)).toBeVisible();
});
