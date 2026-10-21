import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { freshEmail, RUN } from "./run-tag";
import { signIn } from "./sign-in";

// Batch 5.3 (ADR 0015): Promotions on the shelf, a Voucher in the Cart,
// staff screens for both, and the Referral page.
test.describe.configure({ timeout: 180_000 });

test("Home shows what is on sale, with the regular price struck through", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const sale = page.getByRole("region", { name: "On sale this week" });
  await expect(sale.getByRole("listitem").first()).toBeVisible();
  // The seeded Coffee week: 15% off coffee and tea.
  await expect(sale.locator("s").first()).toBeVisible();
});

test("a new Customer's first-order Voucher comes off the Cart, and can be removed", async ({
  page,
}) => {
  await signIn(page, freshEmail("voucher"), "/c/dairy-and-eggs/milk");
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  for (let i = 2; i <= 7; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(`^Cart: .* ${i} items$`) })
    ).toBeVisible({ timeout: 30_000 });
  }
  await page.goto("/cart", { waitUntil: "networkidle" });
  const summary = page.getByRole("complementary", { name: "Order summary" });

  await summary.getByLabel("Have a Voucher code?").fill("nope");
  await summary.getByRole("button", { name: "Apply" }).click();
  await expect(summary.getByRole("alert")).toHaveText(
    "We do not know that code. Check it and try again.",
    { timeout: 30_000 }
  );

  await summary.getByLabel("Have a Voucher code?").fill("welcome100");
  await summary.getByRole("button", { name: "Apply" }).click();
  await expect(summary.getByText("₱100.00 off.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    summary.getByRole("term").filter({ hasText: "Voucher WELCOME100" })
  ).toBeVisible();
  // 7 x 115.00 = 805.00, less 100.00.
  await expect(
    summary.getByRole("link", { name: /^Checkout, ₱705\.00/ })
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await summary.getByRole("button", { name: "Remove" }).click();
  await expect(summary.getByLabel("Have a Voucher code?")).toBeVisible({
    timeout: 30_000,
  });
});

test("a Merchandiser runs a Promotion and makes a Voucher without code", async ({
  page,
}) => {
  await signIn(page, "merchandiser@hoshimono.test", "/admin/promotions");
  await page.goto("/admin/promotions/new", { waitUntil: "networkidle" });
  await page.getByLabel("Name").fill(`Banana week ${RUN}`);
  await page.getByLabel("Percent off").fill("20");
  await page.getByLabel("Add a Product").fill("Banana Chips, 200 g");
  await page.getByRole("button", { name: "Add Product" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Create Promotion" }).click();
  await expect(page.getByText("Promotion created.")).toBeVisible({
    timeout: 30_000,
  });

  // The shelf shows it: 75.00 becomes 60.00.
  await page.goto("/search?q=banana+chips", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("listitem").filter({ hasText: "Banana Chips" }).first()
  ).toContainText("₱60.00", { timeout: 30_000 });

  await page.goto("/admin/vouchers/new", { waitUntil: "networkidle" });
  await page.getByLabel("Code", { exact: true }).fill(`TEST${RUN}`);
  await page
    .getByLabel("It gives", { exact: true })
    .selectOption("free_delivery");
  await page.getByRole("button", { name: "Create Voucher" }).click();
  await expect(page.getByText("Voucher created.")).toBeVisible({
    timeout: 30_000,
  });
  await page.goto("/admin/vouchers", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("row").filter({ hasText: `TEST${RUN}`.toUpperCase() })
  ).toContainText("Free delivery");
});

test("a Customer finds their invite link and Vouchers", async ({ page }) => {
  await signIn(page, freshEmail("invite"), "/account/invite");
  await expect(
    page.getByRole("heading", { level: 1, name: "Invite friends" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Your link")).toHaveValue(/\/r\/[A-Z2-9]{6}$/);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
