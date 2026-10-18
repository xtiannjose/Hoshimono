import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test } from "@playwright/test";

import { signIn } from "./sign-in";

// Phase 2 exit: a Customer places and tracks a COD order on a phone.
test.use({ ...devices["Pixel 7"] });
test.describe.configure({ timeout: 120_000 });

test("a guest fills a Cart, signs in at Checkout, pays cash and tracks the Order", async ({
  page,
}) => {
  // Browse and add as a guest: 5 x Fresh Milk clears the Pasig minimum.
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  for (let i = 1; i < 5; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
  }
  await page.getByRole("button", { name: /5\s*View cart/ }).click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await drawer.getByRole("link", { name: /^Checkout/ }).click();

  // Checkout asks a guest to sign in, then keeps the Cart.
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fcheckout/);
  await signIn(page, "ligaya@example.com", "/checkout");
  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout" })
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  const summary = page.getByRole("complementary", { name: "Order summary" });
  await expect(summary.getByText("Magnolia Fresh Milk")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Home/ })).toBeChecked();

  // Hold a delivery window.
  const window = page.locator('input[name="slot"]:not([disabled])').first();
  await window.locator("xpath=..").click();
  await expect(page.getByText("Held for you for 10 minutes")).toBeVisible();
  await page.getByLabel("Mobile number").fill("0917 555 0142");
  // Nothing scrolls sideways on a phone.
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const place = page.getByRole("button", { name: /^Place order, / });
  const shown = (await place.textContent())!.replace("Place order, ", "");
  expect(shown).toBe("₱624.00"); // 5 x ₱115.00 + ₱49.00 delivery
  await place.click();

  // The confirmation total is the priceCart total, to the centavo.
  await expect(page).toHaveURL(/\/checkout\/confirmed\/SW-\d{6}-[A-Z2-9]{4}$/);
  await expect(
    page.getByRole("heading", { name: "Salamat! Your order is in." })
  ).toBeVisible();
  await expect(page.getByTestId("order-total")).toHaveText(shown);
  await expect(page.getByText(`have ${shown} ready in cash`)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // The confirmation SMS went to the number given at Checkout.
  const orderNo = page.url().split("/").pop()!;
  await expect
    .poll(async () => {
      const res = await page.request.get("/api/dev/mailbox?to=%2B639175550142");
      return res.ok() ? ((await res.json()) as { text: string }).text : "";
    })
    .toContain(`order ${orderNo} is confirmed`);

  await page.getByRole("link", { name: "Track your order" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Track your order" })
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Order confirmed" })
  ).toHaveAttribute("aria-current", "step");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // Cancel before picking.
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("This order was cancelled.")).toBeVisible();

  // Order history lists it.
  await page.goto("/account/orders");
  const listed = page.getByRole("link", { name: new RegExp(orderNo) });
  await expect(listed).toContainText("Cancelled");
  await expect(listed).toContainText(shown);
});

test("the cron route answers only the host", async ({ request }) => {
  expect((await request.get("/api/cron/tick")).status()).toBe(404);
  const wrong = { headers: { authorization: "Bearer nope" } };
  expect((await request.get("/api/cron/tick", wrong)).status()).toBe(404);
  const res = await request.get("/api/cron/tick", {
    headers: { authorization: "Bearer e2e-cron-secret" },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ jobs: { failed: 0 } });
});
