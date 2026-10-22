import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { signInAs } from "./sign-in";

// Batch 4.4 (ADR 0012): stock changes, the Slot schedule, Zone fees and the
// daily report. The printouts are checked in dispatch.spec. These tests
// sign in with accounts no other spec uses.
test.describe.configure({ timeout: 180_000 });

test("staff receive eggs and are asked why stock was taken off", async ({
  browser,
}) => {
  const page = await signInAs(browser, "Technical");
  await page.goto("/admin/stock?q=Large+Eggs", { waitUntil: "networkidle" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("link", { name: "Large Eggs, 12 pack" }).click();
  await expect(
    page.getByRole("heading", { name: "Large Eggs, 12 pack" })
  ).toBeVisible({ timeout: 30_000 });

  const receive = page
    .locator("form")
    .filter({ hasText: "Received from a supplier" });
  await receive.getByLabel("How many came in").fill("24");
  await receive
    .getByLabel("Delivery receipt number (optional)")
    .fill("DR-E2E-1");
  await receive.getByRole("button", { name: "Add to stock" }).click();
  await expect(receive.getByRole("status")).toHaveText("Saved.", {
    timeout: 30_000,
  });
  await expect(
    page.getByRole("listitem").filter({ hasText: "DR-E2E-1" })
  ).toContainText("Received: DR-E2E-1 by Hoshimono Tech+24");

  const shrink = page
    .locator("form")
    .filter({ hasText: "Spoiled, damaged or lost" });
  await shrink.getByLabel("How many to take off").fill("2");
  await shrink.getByRole("button", { name: "Take off stock" }).click();
  await expect(shrink.getByRole("alert")).toHaveText(
    "Say what happened to them.",
    { timeout: 30_000 }
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("an admin adds a Sunday evening window, removes it, and is told a fee must be 0 or more", async ({
  browser,
}) => {
  const page = await signInAs(browser, "Admin");
  await page.goto("/admin/setup", { waitUntil: "networkidle" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const add = page.locator("form").filter({ hasText: "Add window" });
  await add.getByLabel("Day").selectOption({ label: "Sunday" });
  await add.getByLabel("From").fill("20:00");
  await add.getByLabel("To").fill("21:00");
  await add.getByLabel("Orders per Slot").fill("5");
  await add.getByRole("button", { name: "Add window" }).click();
  const sunday = page.getByRole("region", { name: "Sunday" });
  const evening = sunday
    .locator("form")
    .filter({ hasText: "8:00 PM to 9:00 PM" });
  await expect(evening).toBeVisible({ timeout: 30_000 });

  // The same window twice is refused.
  await add.getByLabel("Day").selectOption({ label: "Sunday" });
  await add.getByLabel("From").fill("20:00");
  await add.getByLabel("To").fill("21:00");
  await add.getByRole("button", { name: "Add window" }).click();
  await expect(add.getByRole("alert")).toHaveText(
    "There is already a window at 8:00 PM.",
    { timeout: 30_000 }
  );

  await evening.getByRole("button", { name: "Remove" }).click();
  await expect(evening).toHaveCount(0, { timeout: 30_000 });

  const fees = page.getByRole("form", { name: "Fees for Makati and Taguig" });
  await fees.getByLabel("Delivery fee (₱)").fill("-5");
  await fees.getByRole("button", { name: "Save Makati and Taguig" }).click();
  await expect(fees.getByRole("alert")).toHaveText("Enter 0 or more.", {
    timeout: 30_000,
  });
});

test("the daily report shows a day's numbers and the week before", async ({
  browser,
}) => {
  const page = await signInAs(browser, "Technical");
  await page.goto("/admin/report", { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Daily report" })
  ).toBeVisible();
  for (const tile of [
    "Orders placed",
    "Revenue",
    "Fill rate",
    "Late deliveries",
  ]) {
    await expect(
      page.getByRole("term").filter({ hasText: tile })
    ).toBeVisible();
  }
  await expect(page.getByRole("table").first().getByRole("row")).toHaveCount(8);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
