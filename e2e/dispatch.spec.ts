import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Browser } from "@playwright/test";

// Batch 4.3 (ADR 0011): pick, dispatch with a Rider, deliver with the
// Customer's PIN and the cash, then count the Rider's cash.
test.describe.configure({ timeout: 240_000 });

/** A new browser signed in as one of the test accounts (/dev/sign-in). */
async function as(browser: Browser, label: string, phone = false) {
  const page = await (
    await browser.newContext(phone ? { ...devices["Pixel 7"] } : {})
  ).newPage();
  await page.goto("/dev/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: `Sign in as ${label}` }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/dev/"), {
    timeout: 30_000,
  });
  return page;
}

test("an Order is picked, sent out with a Rider, delivered with the PIN, and the cash counted", async ({
  browser,
}) => {
  // The Client orders 5 Fresh Milk, cash on delivery.
  const shopper = await as(browser, "Client");
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

  // The Picker finds everything.
  const picker = await as(browser, "Picker", true);
  await picker.goto(`/admin/pick/${orderNo}`, { waitUntil: "networkidle" });
  await picker.getByRole("button", { name: "Start picking" }).click();
  await picker
    .getByRole("button", { name: "Found all 5" })
    .click({ timeout: 30_000 });
  await expect(picker.getByText("Done: found all 5")).toBeVisible({
    timeout: 30_000,
  });
  await picker.getByRole("button", { name: "Finish picking" }).click();
  await expect(picker.getByText("Ready for the Rider")).toBeVisible({
    timeout: 30_000,
  });

  // The Dispatcher sends it out with Jun.
  const dispatcher = await as(browser, "Dispatcher");
  await dispatcher.goto("/admin/dispatch", { waitUntil: "networkidle" });
  const ready = dispatcher.getByRole("listitem").filter({ hasText: orderNo });
  await ready.getByLabel("Rider").selectOption({ label: "Jun Dela Rosa" });
  await ready.getByRole("button", { name: "Send out" }).click();
  await expect(
    dispatcher
      .getByRole("region", { name: /Out now/ })
      .getByRole("link", { name: orderNo })
  ).toBeVisible({ timeout: 30_000 });
  expect(
    (await new AxeBuilder({ page: dispatcher }).analyze()).violations
  ).toEqual([]);

  // The Customer sees who is coming and the PIN.
  await shopper.goto(`/orders/${orderNo}`, { waitUntil: "networkidle" });
  await expect(
    shopper.getByRole("heading", { name: "On its way with Jun Dela Rosa" })
  ).toBeVisible();
  const pin = (await shopper.locator("b.font-mono").first().textContent())!;
  expect(pin).toMatch(/^\d{4}$/);

  // The Rider delivers: a wrong PIN is refused, the right one with the cash.
  const rider = await as(browser, "Rider", true);
  await rider.goto("/admin/deliveries", { waitUntil: "networkidle" });
  const stop = rider.getByRole("listitem").filter({ hasText: orderNo });
  await expect(stop).toContainText("Collect ₱624.00 in cash");
  expect((await new AxeBuilder({ page: rider }).analyze()).violations).toEqual(
    []
  );
  await stop
    .getByLabel("Customer's PIN")
    .fill(pin === "0000" ? "1111" : "0000");
  await stop.getByRole("button", { name: "Delivered" }).click();
  await expect(
    rider.getByText("That PIN is not right. 4 tries left.")
  ).toBeVisible({ timeout: 30_000 });
  await stop.getByLabel("Customer's PIN").fill(pin);
  await stop.getByRole("button", { name: "Delivered" }).click();
  await expect(rider.getByText("Nothing to deliver right now.")).toBeVisible({
    timeout: 30_000,
  });

  // The Dispatcher counts Jun's cash for the day.
  await dispatcher.goto("/admin/cash", { waitUntil: "networkidle" });
  const jun = dispatcher
    .getByRole("listitem")
    .filter({ hasText: "Jun Dela Rosa" });
  await expect(jun).toContainText("₱624.00");
  await jun.getByRole("button", { name: "Record count" }).click();
  await expect(jun).toContainText(
    "Counted ₱624.00 by Marites Aquino: matches.",
    {
      timeout: 30_000,
    }
  );

  await shopper.reload({ waitUntil: "networkidle" });
  await expect(
    shopper.getByRole("listitem").filter({ hasText: "Delivered" })
  ).toHaveAttribute("aria-current", "step");
});
