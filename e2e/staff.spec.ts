import { expect, test } from "@playwright/test";

import { RUN } from "./run-tag";
import { signIn } from "./sign-in";

// Batch 4.1: the staff screens, each role to its own work.
test.describe.configure({ timeout: 150_000 });

test("a Dispatcher moves an Order along with a note, and the Customer sees it", async ({
  browser,
}) => {
  // The Client places a cash-on-delivery Order.
  const shopper = await (await browser.newContext()).newPage();
  await shopper.goto("/dev/sign-in", { waitUntil: "networkidle" });
  await shopper.getByRole("link", { name: "Sign in as Client" }).click();
  await expect(shopper).toHaveURL(/localhost:\d+\/$/, { timeout: 30_000 });
  await shopper.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await shopper.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = shopper.getByRole("group", {
    name: "Quantity of Fresh Milk",
  });
  for (let i = 2; i <= 5; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
    await expect(
      shopper.getByRole("button", { name: new RegExp(`^Cart: .* ${i} items$`) })
    ).toBeVisible({ timeout: 30_000 });
  }
  await shopper.goto("/checkout", { waitUntil: "networkidle" });
  await shopper
    .locator('input[name="slot"]:not([disabled])')
    .first()
    .locator("xpath=..")
    .click();
  await expect(shopper.getByText(/Held for you until \d/)).toBeVisible();
  await shopper.getByRole("button", { name: /^Place order, / }).click();
  await expect(shopper).toHaveURL(/\/checkout\/confirmed\/SW-/, {
    timeout: 30_000,
  });
  const orderNo = shopper.url().split("/").pop()!;

  // The Dispatcher sees the queue, and only the queue.
  const staff = await (await browser.newContext()).newPage();
  await signIn(staff, "dispatcher@hoshimono.test", "/admin");
  const menu = staff.getByRole("navigation", { name: "Admin" });
  await expect(menu.getByRole("link", { name: "Orders" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Products" })).toHaveCount(0);
  await staff.goto("/admin/products", { waitUntil: "networkidle" });
  await expect(
    staff.getByRole("heading", { name: "We could not find that page" })
  ).toBeVisible();

  await staff.goto(`/admin/orders?q=${orderNo}`, { waitUntil: "networkidle" });
  await staff.getByRole("link", { name: orderNo }).click();
  await expect(staff.getByRole("heading", { name: orderNo })).toBeVisible();

  await staff.getByLabel("Add a note for the team").fill("Gate code 4421");
  await staff.getByRole("button", { name: "Add note" }).click();
  await expect(staff.getByText("Gate code 4421")).toBeVisible({
    timeout: 30_000,
  });

  await staff.getByRole("radio", { name: "Start picking" }).check();
  await staff.getByRole("button", { name: "Save" }).click();
  await expect(staff.getByText("Picking by Marites Aquino")).toBeVisible({
    timeout: 30_000,
  });

  // Cancelling asks why, then frees the Order.
  await staff.getByRole("radio", { name: /^Cancel the Order/ }).check();
  await staff.getByRole("button", { name: "Save" }).click();
  await expect(
    staff.getByRole("alert").filter({ hasText: "Say why" })
  ).toBeVisible({ timeout: 30_000 });
  await staff.getByRole("radio", { name: /^Cancel the Order/ }).check();
  await staff.getByLabel(/^Reason/).fill("Customer called to cancel");
  await staff.getByRole("button", { name: "Save" }).click();
  await expect(
    staff.getByText("Cancelled by Marites Aquino: Customer called to cancel")
  ).toBeVisible({ timeout: 30_000 });

  await shopper.goto(`/orders/${orderNo}`, { waitUntil: "networkidle" });
  await expect(shopper.getByText("This order was cancelled.")).toBeVisible();
});

test("an Admin adds staff, and the audit log names who did it", async ({
  page,
}) => {
  await page.goto("/dev/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Sign in as Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });

  await page.goto("/admin/staff", { waitUntil: "networkidle" });
  const email = `lito-${RUN}@hoshimono.test`;
  await page.getByLabel("Name").fill("Lito Ramos");
  await page.getByLabel("Email they sign in with").fill(email);
  await page.getByLabel("Role").first().selectOption("dispatcher");
  await page.getByRole("button", { name: "Add to staff" }).click();
  await expect(page.getByText(email)).toBeVisible({ timeout: 30_000 });

  await page.goto("/admin/audit?entity=staff", { waitUntil: "networkidle" });
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toContainText("Rafael Cruz");
  await expect(row).toContainText("create staff");
});
