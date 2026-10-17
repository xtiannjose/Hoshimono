import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("signed-out visitors are sent to sign-in from guarded pages", async ({
  page,
}) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin$/);
});

test("sign-in asks for a valid email, then confirms the link was sent", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const email = page.getByLabel("Email");
  const submit = page.getByRole("button", { name: "Email me a link" });

  await email.fill("not-an-email");
  await submit.click();
  await expect(page.getByText("Enter an email address like")).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveValue("not-an-email");

  await email.fill("ligaya@example.com");
  await submit.click();
  await expect(page.getByRole("status")).toContainText("ligaya@example.com");
});

for (const scheme of ["light", "dark"] as const) {
  test(`sign-in has no axe violations in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/sign-in");
    await expect(page.getByLabel("Email")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("health check reports the database is reachable", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});
