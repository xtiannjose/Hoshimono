import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test } from "@playwright/test";

import { signIn } from "./sign-in";

// Batch 4.2 (ADR 0010): a Picker picks on a phone, offers a substitute, and
// the Customer's "no" leaves it out of the Final Total.
test.use({ ...devices["Pixel 7"] });
test.describe.configure({ timeout: 180_000 });

test("a Picker offers a substitute, the Customer refuses it, and pays only for what was found", async ({
  browser,
}) => {
  // Ligaya orders 5 Fresh Milk, cash on delivery. Each spec shops as its
  // own Customer: parallel specs on one account would share one Cart.
  const shopper = await (
    await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" })
  ).newPage();
  await signIn(shopper, "ligaya@example.com", "/");
  await shopper.goto("/c/dairy-and-eggs/milk", { waitUntil: "networkidle" });
  await shopper.getByRole("button", { name: "Add Fresh Milk to cart" }).click();
  const stepper = shopper.getByRole("group", {
    name: "Quantity of Fresh Milk",
  });
  for (let i = 2; i <= 5; i++) {
    await stepper.getByRole("button", { name: "Add one" }).click();
    await expect(
      shopper.getByRole("button", { name: new RegExp(`${i}\\s*View cart`) })
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

  // The Picker finds 3 and offers a substitute for the other 2.
  const picker = await (
    await browser.newContext({ ...devices["Pixel 7"], serviceWorkers: "block" })
  ).newPage();
  await signIn(picker, "picker@hoshimono.test", "/admin/pick");
  await picker.goto("/admin/pick", { waitUntil: "networkidle" });
  await picker.getByRole("link", { name: new RegExp(orderNo) }).click();
  await picker.getByRole("button", { name: "Start picking" }).click();
  await expect(
    picker.getByRole("button", { name: "Finish picking" })
  ).toBeVisible({ timeout: 30_000 });
  expect((await new AxeBuilder({ page: picker }).analyze()).violations).toEqual(
    []
  );
  await picker.getByRole("button", { name: "Short" }).click();
  await picker.getByLabel("How many found?").fill("3");
  await picker.getByRole("button", { name: "Save", exact: true }).click();
  await expect(picker.getByText("Short: found 3 of 5")).toBeVisible({
    timeout: 30_000,
  });
  await picker.getByRole("button", { name: "Offer substitute" }).click();
  await expect(picker.getByText(/Waiting for the Customer until/)).toBeVisible({
    timeout: 30_000,
  });

  // The Customer gets a text with a link, and says no.
  let link = "";
  await expect
    .poll(async () => {
      const res = await shopper.request.get(
        "/api/dev/mailbox?to=%2B639171234501"
      );
      const text = res.ok()
        ? ((await res.json()) as { text: string }).text
        : "";
      link = /https?:\/\/\S+\/s\/[\w-]+/.exec(text)?.[0] ?? "";
      return link;
    })
    .not.toBe("");
  await shopper.goto(link, { waitUntil: "networkidle" });
  await expect(
    shopper.getByRole("heading", { name: "Is this substitute okay?" })
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page: shopper }).analyze()).violations
  ).toEqual([]);
  await shopper.getByRole("button", { name: "No, leave it out" }).click();
  await expect(
    shopper.getByRole("heading", { name: "Okay, we'll leave it out" })
  ).toBeVisible({ timeout: 30_000 });

  // The Picker sees the answer and finishes.
  await picker.reload({ waitUntil: "networkidle" });
  await expect(picker.getByText("They said no: leave it out.")).toBeVisible();
  await picker.getByRole("button", { name: "Finish picking" }).click();
  await expect(picker.getByText("Ready for the Rider")).toBeVisible({
    timeout: 30_000,
  });

  // 3 x 115.00 + 49.00 delivery: only what was found.
  await shopper.goto(`/orders/${orderNo}`, { waitUntil: "networkidle" });
  await expect(
    shopper.getByText("Final total, as packed").locator("xpath=..")
  ).toContainText("₱394.00");
});
