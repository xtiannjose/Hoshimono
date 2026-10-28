import { expect, test } from "@playwright/test";

import { freshEmail } from "./run-tag";
import { signIn, signInAs } from "./sign-in";

// The Admin's tools on an Order (docs/runbook.md): record a GCash payment
// PayMongo shows but no webhook applied, text the Customer, give a
// Voucher, then cancel, and the Customer hears each.
test.describe.configure({ timeout: 300_000 });

test("an Admin records a missed payment, texts, gives a Voucher and cancels", async ({
  page,
  browser,
}) => {
  const phone = "+639175550188";
  const texts = async () => {
    const res = await page.request.get(
      `/api/dev/mailbox?to=${encodeURIComponent(phone)}`
    );
    return res.ok() ? ((await res.json()) as { text: string }).text : "";
  };

  // A GCash Order the Customer paid in PayMongo, but no webhook came.
  await page.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = page.getByRole("group", { name: "Quantity of Fresh Milk" });
  for (let i = 2; i <= 5; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(`^Cart: .* ${i} items$`) })
    ).toBeVisible({ timeout: 30_000 });
  }
  await page.goto("/checkout");
  await signIn(page, freshEmail("tools"), "/checkout");
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
  await page
    .locator('input[name="slot"]:not([disabled])')
    .first()
    .locator("xpath=..")
    .click();
  await expect(page.getByText(/Held for you until \d/)).toBeVisible();
  await page.getByLabel("Mobile number").fill("0917 555 0188");
  await page.getByRole("radio", { name: /GCash/ }).check();
  await page.getByRole("button", { name: /^Place order, / }).click();
  await expect(page).toHaveURL(/\/dev\/pay\/fake_cs_/, { timeout: 30_000 });
  await page.goto("/account/orders", { waitUntil: "networkidle" });
  const orderNo = (await page
    .getByRole("link", { name: /SW-\d{6}-\w{4}/ })
    .first()
    .textContent())!.match(/SW-\d{6}-\w{4}/)![0];

  const admin = await signInAs(browser, "Admin");
  await admin.goto(`/admin/orders/${orderNo}`, { waitUntil: "networkidle" });
  await admin.getByLabel("PayMongo payment id").fill("pay_seen_in_dashboard");
  await admin.getByLabel(/PayMongo shows ₱[\d,.]+ paid/).check();
  await admin.getByRole("button", { name: "Record the payment" }).click();
  await expect(
    admin.getByText("Confirmed", { exact: true }).first()
  ).toBeVisible({ timeout: 30_000 });

  await admin
    .getByLabel("Text the Customer")
    .fill("Hi! Your order is confirmed. See you this afternoon.");
  await admin.getByRole("button", { name: "Send the text" }).click();
  await expect(admin.getByText("Sent, and added to the notes.")).toBeVisible({
    timeout: 30_000,
  });
  await expect.poll(texts).toContain("See you this afternoon.");

  await admin.getByLabel("Voucher amount (₱)").fill("50");
  await admin.getByLabel("Why").fill("Delivery came late last week");
  await admin.getByRole("button", { name: "Give the Voucher" }).click();
  await expect(admin.getByText("Given, and the Customer is told.")).toBeVisible(
    {
      timeout: 30_000,
    }
  );
  await expect
    .poll(texts)
    .toMatch(/₱50\.00 off your next order with code CREDIT-/);

  // Plans change: another Slot, and the Customer gets the new time.
  await admin.getByLabel("Deliver in another Slot").selectOption({ index: 0 });
  await admin.getByRole("button", { name: "Move it" }).click();
  await expect(admin.getByText("Moved, and the Customer is told.")).toBeVisible(
    { timeout: 30_000 }
  );
  await expect.poll(texts).toContain(`Order ${orderNo} now arrives`);

  await admin.getByLabel(/Cancel the Order/).check();
  await admin
    .getByLabel("Reason (needed to cancel or for a failed delivery)")
    .fill("Hub ran out of milk");
  await admin.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(texts, { timeout: 60_000 })
    .toContain(`we had to cancel order ${orderNo}`);
});
