import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { signIn } from "./sign-in";

test.describe.configure({ timeout: 90_000 });

test("a Customer keeps an address book we can deliver to", async ({ page }) => {
  await signIn(page, "teresita@example.com", "/account/addresses");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your addresses" })
  ).toBeVisible();
  await expect(page.getByText("45 Calle Industria")).toBeVisible();

  await page.getByRole("link", { name: "Add an address" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Add an address" })
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Name this address").fill("Office");
  await page
    .getByLabel("House or unit number and street")
    .fill("8 Eastwood Avenue");
  await page.getByLabel("City").selectOption("Quezon City");
  await page.getByLabel("Barangay").fill("Diliman");
  await page.getByLabel("Landmark").fill("Beside the coffee shop");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Diliman" })
  ).toHaveText("We do not deliver to Diliman, Quezon City yet.");
  // The form keeps what was typed.
  await expect(page.getByLabel("Landmark")).toHaveValue(
    "Beside the coffee shop"
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByLabel("Barangay").fill("Bagumbayan");
  await page.getByLabel("Use this address by default").check();
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page).toHaveURL(/\/account\/addresses$/);
  const office = page.getByRole("listitem").filter({ hasText: "Office" });
  await expect(office.getByText("Default")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await office.getByRole("button", { name: "Remove Office" }).click();
  await expect(page.getByText("8 Eastwood Avenue")).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: "Home" }).getByText("Default")
  ).toBeVisible();
});
