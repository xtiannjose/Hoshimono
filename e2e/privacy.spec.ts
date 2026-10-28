import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { freshEmail } from "./run-tag";
import { signIn } from "./sign-in";

// A Customer's data on request (ADR 0020): download it, then delete the
// account.
test("a Customer downloads their data and deletes their account", async ({
  page,
}) => {
  const email = freshEmail("privacy");
  await signIn(page, email, "/account");

  const download = await page.request.get("/api/account/data");
  expect(download.headers()["content-disposition"]).toContain("attachment");
  expect((await download.json()).profile).toMatchObject({ email });

  await page.locator("summary", { hasText: "Delete my account" }).click();
  await page.getByRole("button", { name: "Yes, delete my account" }).click();
  await expect(page.getByText("Tick the box first.")).toBeVisible({
    timeout: 30_000,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByLabel("I understand this can't be undone").check();
  await page.getByRole("button", { name: "Yes, delete my account" }).click();
  await expect(
    page.getByRole("heading", { name: "Your account is deleted" })
  ).toBeVisible({ timeout: 30_000 });

  // Signed out, and the data is gone.
  expect((await page.request.get("/api/account/data")).status()).toBe(401);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in/);
});
