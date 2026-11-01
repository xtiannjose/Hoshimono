import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { freshEmail } from "./run-tag";

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
  const email = page.getByRole("textbox", { name: "Email" });
  const submit = page.getByRole("button", { name: "Email me a link" });

  await email.fill("not-an-email");
  await submit.click();
  await expect(page.getByText("Enter an email address like")).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveValue("not-an-email");

  const address = freshEmail("link");
  await email.fill(address);
  await submit.click();
  await expect(page.getByRole("status")).toContainText(address);
});

for (const scheme of ["light", "dark"] as const) {
  test(`sign-in has no axe violations in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/sign-in");
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
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

test("signs in with a code texted to a mobile number", async ({ page }) => {
  await page.goto("/sign-in?next=%2Faccount", { waitUntil: "networkidle" });
  // The radio is visually hidden inside its label, so press the label.
  await page
    .locator("label")
    .filter({ hasText: /^Mobile number$/ })
    .click();
  await expect(
    page.getByRole("radio", { name: "Mobile number" })
  ).toBeChecked();
  await page
    .getByRole("textbox", { name: "Mobile number" })
    .fill("0917 888 1234");
  await page.getByRole("button", { name: "Text me a code" }).click();
  await expect(page.getByRole("status")).toContainText("0917 888 1234");

  const res = await page.request.get("/api/dev/mailbox?to=%2B639178881234");
  const { text } = (await res.json()) as { text: string };
  const code = /\d{6}/.exec(text)![0];
  const field = page.getByRole("textbox", { name: "Code" });
  await field.fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That code did not work.")).toBeVisible();
  await field.fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Signed in with")).toContainText("0917 888 1234");
  // No made-up name: the Customer adds their own.
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    ""
  );
});

test("stops a fourth sign-in link to the same email within 15 minutes", async ({
  page,
}) => {
  const limited = freshEmail("limit");
  for (let i = 0; i < 4; i++) {
    // The form posts without JavaScript too, so no need to wait for it.
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: "Email" }).fill(limited);
    await page.getByRole("button", { name: "Email me a link" }).click();
    if (i < 3) await expect(page.getByRole("status")).toContainText(limited);
  }
  await expect(
    page.getByText(/Too many tries. Please wait \d+ minutes?/)
  ).toBeVisible();
});

test("the sign-in sending endpoints are closed to direct calls", async ({
  request,
}) => {
  for (const path of [
    "sign-in/magic-link",
    "phone-number/send-otp",
    "phone-number/verify",
  ]) {
    const res = await request.post(`/api/auth/${path}`, {
      data: {
        email: "x@example.com",
        phoneNumber: "+639171234567",
        code: "123456",
      },
    });
    expect(res.status(), path).toBe(404);
  }
});
