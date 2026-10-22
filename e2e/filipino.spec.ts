import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Filipino pages (ADR 0017): /fil addresses, words from the fil dictionary.

test("the shop in Filipino keeps the language while shopping", async ({
  page,
}) => {
  await page.goto("/fil", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Sariwang grocery, ihahatid ngayon.",
    })
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
    .analyze();
  expect(results.violations).toEqual([]);

  // An aisle link stays in Filipino.
  await page
    .getByRole("navigation", { name: "Mga kategorya" })
    .getByRole("link", { name: "Dairy and eggs" })
    .click();
  await expect(page).toHaveURL(/\/fil\/c\/dairy-and-eggs$/, {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle");

  // Add, in Filipino words.
  const card = page
    .getByRole("region", { name: "Mga produkto" })
    .getByRole("article")
    .first();
  const add = card.getByRole("button", { name: /^Idagdag ang .+ sa cart$/ });
  const name = (await add.getAttribute("aria-label"))!.slice(12, -8);
  await add.click();
  await expect(
    card.getByRole("group", { name: `Dami ng ${name}` })
  ).toBeVisible();
  await expect(page.locator("#live-region")).toHaveText(`${name}, 1 sa cart`);

  // The footer switch opens the same page in English.
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Read in English" })
    .click();
  await expect(page).toHaveURL(/localhost:\d+\/c\/dairy-and-eggs$/, {
    timeout: 30_000,
  });
  await expect(page.locator("html")).toHaveAttribute("lang", "en-PH");
  await expect(
    page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Basahin sa Filipino" })
  ).toBeVisible();
});

test("an /en address goes to the one without a prefix, and says both languages", async ({
  page,
}) => {
  const response = await page.goto("/en/cart");
  await expect(page).toHaveURL(/localhost:\d+\/cart$/);
  expect(response?.headers()["link"]).toContain('hreflang="fil"');
  await expect(
    page.getByRole("heading", { level: 1, name: "Your cart" })
  ).toBeVisible();
});
