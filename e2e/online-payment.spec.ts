import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { freshEmail } from "./run-tag";
import { signIn } from "./sign-in";

// Batch 3.2 through the stand-in provider (PAYMENT_PROVIDER=fake): a failed
// payment brings the Customer back with the Cart intact, and only the
// signed webhook confirms the Order.
test.describe.configure({ timeout: 180_000 });

async function chooseSlotAndPhone(page: Page) {
  await page
    .locator('input[name="slot"]:not([disabled])')
    .first()
    .locator("xpath=..")
    .click();
  await expect(page.getByText(/Held for you until \d/)).toBeVisible();
  await page.getByLabel("Mobile number").fill("0917 555 0177");
}

test("a failed GCash payment returns the Cart; paying again confirms the Order", async ({
  page,
}) => {
  // 5 x Fresh Milk clears the Pasig minimum.
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  // One tap at a time, each saved: a busy dev server answers slowly.
  const saved = (n: number) =>
    expect(
      page.getByRole("button", {
        name: new RegExp(`^Cart: .* ${n} items?$`),
      })
    ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  await saved(1);
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  for (let i = 2; i <= 5; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
    await saved(i);
  }
  await page.goto("/checkout");
  await signIn(page, freshEmail("gcash"), "/checkout");
  await page
    .getByLabel("House or unit number and street")
    .fill("12 Sampaguita Street");
  await page.getByLabel("City").selectOption("Pasig");
  await page.getByLabel("Barangay").fill("Kapitolyo");
  await page
    .getByRole("textbox", { name: "Landmark" })
    .fill("Across the green sari-sari store");
  await page.getByRole("button", { name: "Deliver here" }).click();
  await page.waitForLoadState("networkidle");

  // Fail: the provider sends the Customer back, nothing is confirmed.
  await chooseSlotAndPhone(page);
  await page.getByRole("radio", { name: /GCash/ }).check();
  await page.getByRole("button", { name: "Place order, ₱624.00" }).click();
  await expect(page).toHaveURL(/\/dev\/pay\/fake_cs_/, { timeout: 30_000 });
  // Hydrated before clicking: next dev compiles the page on first visit.
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Fail payment" }).click();
  await expect(page).toHaveURL(/\/checkout\/pay\/SW-.*back=cancelled/, {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Your payment didn't go through" })
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // Back to cart: the Order is cancelled and its items are back.
  await page.getByRole("button", { name: "Back to cart" }).click();
  await expect(page).toHaveURL(/\/cart$/, { timeout: 30_000 });
  await page.goto("/checkout", { waitUntil: "networkidle" });
  const place = page.getByRole("button", { name: "Place order, ₱624.00" });
  await expect(place).toBeVisible();

  // Pay: only the signed webhook confirms; the return page waits for it.
  await chooseSlotAndPhone(page);
  await page.getByRole("radio", { name: /GCash/ }).check();
  await place.click();
  await expect(page).toHaveURL(/\/dev\/pay\/fake_cs_/, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Pay", exact: true }).click();
  // Pay posts the webhook, then returns: next dev compiles both on first use.
  await expect(page).toHaveURL(/\/checkout\/confirmed\/SW-\d{6}-[A-Z2-9]{4}$/, {
    timeout: 45_000,
  });
  await expect(
    page.getByRole("heading", { name: "Salamat! Your order is in." })
  ).toBeVisible();
  await expect(page.getByText("Paid ₱624.00 with GCash.")).toBeVisible();

  const orderNo = page.url().split("/").pop()!;
  await expect
    .poll(async () => {
      const res = await page.request.get("/api/dev/mailbox?to=%2B639175550177");
      return res.ok() ? ((await res.json()) as { text: string }).text : "";
    })
    .toContain(`order ${orderNo} is confirmed`);

  // The first Order shows as cancelled, the second as confirmed.
  await page.goto("/account/orders");
  await expect(page.getByRole("link", { name: /SW-/ })).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: new RegExp(orderNo) })
  ).not.toContainText("Cancelled");
  await expect(
    page.getByRole("link").filter({ hasText: "Cancelled" })
  ).toHaveCount(1);

  // Cancelling the paid Order gives all of it back, and says so.
  await page.goto(`/orders/${orderNo}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByText("This order was cancelled.")).toBeVisible();
  await expect(page.getByText("Refund to your GCash")).toBeVisible();
  await expect
    .poll(async () => {
      const res = await page.request.get("/api/dev/mailbox?to=%2B639175550177");
      return res.ok() ? ((await res.json()) as { text: string }).text : "";
    })
    .toContain(
      `We refunded ₱624.00 to your GCash for your cancelled order ${orderNo}.`
    );
});
