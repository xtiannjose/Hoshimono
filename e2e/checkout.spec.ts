import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test } from "@playwright/test";

import { freshEmail } from "./run-tag";
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
  await signIn(page, freshEmail("checkout"), "/checkout");
  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout" })
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  // A new Customer gives the address right here (PRD CHK-1).
  await expect(
    page.getByRole("heading", { name: "Where should we deliver?" })
  ).toBeVisible();
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
  const summary = page.getByRole("complementary", { name: "Order summary" });
  await expect(summary.getByText("Magnolia Fresh Milk")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Home/ })).toBeChecked();

  // Hold a delivery window.
  const window = page.locator('input[name="slot"]:not([disabled])').first();
  await window.locator("xpath=..").click();
  await expect(page.getByText(/Held for you until \d/)).toBeVisible();
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

test("choosing an address in another Zone re-prices the Order", async ({
  page,
}) => {
  // Makati's minimum is PHP 700: 7 x Fresh Milk clears it.
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  for (let i = 1; i < 7; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
  }
  // Wait for the server's count, not the instant one, before leaving.
  await expect(
    page.getByRole("button", { name: /7\s*View cart/ })
  ).toBeVisible();
  await page.goto("/checkout");
  await signIn(page, freshEmail("zones"), "/checkout");

  const address = async (line1: string, city: string, barangay: string) => {
    await page.getByLabel("House or unit number and street").fill(line1);
    await page.getByLabel("City").selectOption(city);
    await page.getByLabel("Barangay").fill(barangay);
    await page
      .getByRole("textbox", { name: "Landmark" })
      .fill("Beside the guardhouse");
    await page.getByRole("button", { name: "Deliver here" }).click();
    await page.waitForLoadState("networkidle");
  };
  await address("12 Sampaguita Street", "Pasig", "Kapitolyo");
  const place = page.getByRole("button", { name: /^Place order, / });
  await expect(place).toHaveText("Place order, ₱854.00"); // 805 + 49

  // Add a second address in Makati: Checkout selects it and re-prices.
  await page.getByText("Deliver somewhere else? Add an address").click();
  await page.getByLabel("Name this address").fill("Office");
  await address("Unit 1804, 28th Street", "Makati", "Poblacion");
  await expect(page.getByRole("radio", { name: /Office/ })).toBeChecked();
  await expect(page.getByText("Delivery to Makati and Taguig")).toBeVisible();
  await expect(place).toHaveText("Place order, ₱874.00"); // 805 + 69

  await page
    .locator('input[name="slot"]:not([disabled])')
    .first()
    .locator("xpath=..")
    .click();
  await expect(page.getByText(/Held for you until \d/)).toBeVisible();
  await page.getByLabel("Mobile number").fill("0917 555 0199");
  await place.click();
  await expect(page.getByTestId("order-total")).toHaveText("₱874.00");
});

test("the cart drawer names the Slot held at Checkout", async ({ page }) => {
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  await page
    .getByRole("group", { name: "Quantity of Fresh Milk" })
    .getByRole("button", { name: "Add one" })
    .click();
  // Phones open the Cart from the floating bar.
  await expect(
    page.getByRole("button", { name: /2\s*View cart/ })
  ).toBeVisible();
  await page.goto("/checkout");
  await signIn(page, freshEmail("drawer"), "/checkout");
  await page
    .getByLabel("House or unit number and street")
    .fill("12 Sampaguita Street");
  await page.getByLabel("City").selectOption("Pasig");
  await page.getByLabel("Barangay").fill("Kapitolyo");
  await page
    .getByRole("textbox", { name: "Landmark" })
    .fill("Beside the guardhouse");
  await page.getByRole("button", { name: "Deliver here" }).click();
  await page.waitForLoadState("networkidle");
  await page
    .locator('input[name="slot"]:not([disabled])')
    .first()
    .locator("xpath=..")
    .click();
  await expect(page.getByText(/Held for you until \d/)).toBeVisible();

  // Back on the shelves, the drawer names that Slot and links to change it.
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /View cart/ }).click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(drawer.getByText(/^Held for you until \d/)).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Change" })).toHaveAttribute(
    "href",
    "/checkout"
  );
});
