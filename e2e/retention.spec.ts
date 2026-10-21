import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { freshEmail } from "./run-tag";
import { signIn } from "./sign-in";

// Batch 5.2 (ADR 0014): Shopping Lists, Stock Alerts and consent. Reorder
// and Buy again need a delivered Order, so they are in dispatch.spec.
test.describe.configure({ timeout: 180_000 });

test("a Customer saves a Product to a new list and adds the list to the cart", async ({
  page,
}) => {
  await signIn(page, freshEmail("lists"), "/c/dairy-and-eggs/milk");
  await page
    .getByRole("link", { name: /Fresh Milk/ })
    .first()
    .click();
  await page.getByText("Save to a list").click();
  await page.getByLabel("Name of the new list").fill("Weekly");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 30_000 });

  await page.goto("/account/lists", { waitUntil: "networkidle" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: /Weekly/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Weekly" })
  ).toBeVisible({ timeout: 30_000 });
  await page
    .getByRole("group", { name: /^How many/ })
    .getByRole("button", { name: "Add one" })
    .click();
  await page.getByRole("button", { name: "Add all to cart" }).click();
  // .first(): the screen-reader announcer says it too.
  await expect(
    page.getByText(/Added [12] items? to your cart\./).first()
  ).toBeVisible({ timeout: 30_000 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("a Customer asks to hear when a sold-out Product is back, then stops it", async ({
  page,
}) => {
  await signIn(page, freshEmail("alert"), "/search?q=ube+roll");
  await page
    .getByRole("link", { name: /Ube Roll/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Tell me when it is back" }).click();
  await expect(
    page.getByText("We will message you when it is back.")
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "No need, stop the alert" }).click();
  await expect(
    page.getByRole("button", { name: "Tell me when it is back" })
  ).toBeVisible({ timeout: 30_000 });
});

test("reminders and offers stay off until the Customer turns them on", async ({
  page,
}) => {
  await signIn(page, freshEmail("consent"), "/account");
  const box = page.getByRole("checkbox", {
    name: "Send me reminders and offers by email",
  });
  await expect(box).not.toBeChecked();
  await box.check();
  await page.waitForLoadState("networkidle");
  await page.reload({ waitUntil: "networkidle" });
  await expect(box).toBeChecked({ timeout: 30_000 });

  // A stop link that we did not sign changes nothing.
  await page.goto("/stop/someone.forged", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Stop reminders and offers" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 30_000 });
  await page.goto("/account", { waitUntil: "networkidle" });
  await expect(box).toBeChecked();
});
