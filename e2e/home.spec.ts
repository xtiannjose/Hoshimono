import { expect, test } from "@playwright/test";

// 360 px is the narrowest common Android width, 390 px an iPhone 12 to 15.
for (const width of [360, 390]) {
  test(`the header fits a ${width} px phone with 8 px between its buttons`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(width);
    const boxes = await page
      .locator("header")
      .getByRole("link")
      .or(page.locator("header").getByRole("button"))
      .evaluateAll((els) =>
        els
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.top < 72)
          .sort((a, b) => a.left - b.left)
          .map((r) => ({ left: r.left, right: r.right }))
      );
    for (const [a, b] of boxes.slice(1).map((box, i) => [boxes[i], box])) {
      expect(b.left - a.right).toBeGreaterThanOrEqual(8);
    }
    expect(boxes.at(-1)!.right).toBeLessThanOrEqual(width - 16);
  });
}

test("home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Hoshimono/);
  // Placeholders are decoration until real photos arrive: nothing to read out.
  await expect(page.getByRole("img", { name: /Photo to come/ })).toHaveCount(0);
  // Not inside a shop aisle, so no Category is marked.
  await expect(
    page
      .getByRole("navigation", { name: "Categories" })
      .locator('[aria-current="page"]')
  ).toHaveCount(0);
});

test("home opens on the shop: delivery, Categories and fresh picks", async ({
  page,
}) => {
  await page.goto("/");
  // No hero (ADR 0018): where we deliver, then every Category and Recipes.
  await expect(page.getByRole("region", { name: "Delivery" })).toContainText(
    "Same-day delivery"
  );
  await expect(
    page.getByRole("navigation", { name: "Shop by category" }).getByRole("link")
  ).toHaveCount(10);
  const picks = page.getByRole("region", { name: "Fresh picks today" });
  await expect(picks.getByRole("article")).toHaveCount(6);
});

test("Add becomes a stepper, keeps focus, and goes back at zero", async ({
  page,
}) => {
  await page.goto("/");
  const card = page
    .getByRole("region", { name: "Fresh picks today" })
    .getByRole("article")
    .first();
  const name = (await card.getByRole("link").last().innerText()).trim();

  await card.getByRole("button", { name: `Add ${name} to cart` }).click();
  const stepper = card.getByRole("group", { name: `Quantity of ${name}` });
  await expect(stepper).toBeVisible();
  const plus = stepper.getByRole("button", { name: "Add one" });
  await expect(plus).toBeFocused();
  await expect(page.locator("#live-region")).toHaveText(`${name}, 1 in cart`);

  await plus.click();
  await expect(stepper.locator("output")).toHaveText("2");

  const minus = stepper.getByRole("button", { name: "Remove one" });
  await minus.click();
  await minus.click();
  const add = card.getByRole("button", { name: `Add ${name} to cart` });
  await expect(add).toBeVisible();
  await expect(add).toBeFocused();
});

test("the footer leads to short answers on delivery and refunds", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Help" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Help" })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Can I cancel an order?")).toBeVisible();
});
