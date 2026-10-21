import { expect, test } from "@playwright/test";

// The seeded test accounts sign in from /dev/sign-in (docs/06 section 6).
test.describe.configure({ timeout: 90_000 });

for (const { label, landing, check } of [
  {
    label: "Admin",
    landing: /\/admin$/,
    check: "Signed in as Rafael Cruz (admin)",
  },
  {
    label: "Technical",
    landing: /\/admin$/,
    check: "Signed in as Hoshimono Tech (admin)",
  },
] as const) {
  test(`${label} signs in in one click and lands in the admin`, async ({
    page,
  }) => {
    await page.goto("/dev/sign-in", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: `Sign in as ${label}` }).click();
    await expect(page).toHaveURL(landing, { timeout: 30_000 });
    await expect(page.getByText(check)).toBeVisible();
  });
}

test("Client signs in in one click, with an address ready", async ({
  page,
}) => {
  await page.goto("/dev/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Sign in as Client" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/, { timeout: 30_000 });
  await page.goto("/account/addresses", { waitUntil: "networkidle" });
  await expect(page.getByText("8 Camia Street")).toBeVisible();
});
