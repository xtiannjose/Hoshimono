import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { signInAs } from "./sign-in";

// The accessibility audit (Batch 6.2): every page a guest, a Customer and
// an Admin can open, in light and dark, against WCAG 2.2 AA. Other specs
// check the pages their journeys pass through; this one misses none.
test.describe.configure({ timeout: 600_000 });

const SHOP = [
  "/",
  "/c/dairy-and-eggs",
  "/c/dairy-and-eggs/milk",
  "/search?q=gatas",
  "/search?q=zzzzqx",
  "/recipes",
  "/articles",
  "/delivery",
  "/help",
  "/sign-in",
  "/cart",
  "/offline",
  "/no-such-page",
  "/fil",
  "/fil/c/fruit-and-vegetables",
];
const ACCOUNT = [
  "/account",
  "/account/orders",
  "/account/addresses",
  "/account/addresses/new",
  "/account/lists",
  "/account/invite",
  "/checkout",
];
const ADMIN = [
  "/admin",
  "/admin/orders",
  "/admin/pick",
  "/admin/dispatch",
  "/admin/deliveries",
  "/admin/cash",
  "/admin/claims",
  "/admin/refunds",
  "/admin/stock",
  "/admin/setup",
  "/admin/report",
  "/admin/products",
  "/admin/products/new",
  "/admin/categories",
  "/admin/import",
  "/admin/promotions",
  "/admin/promotions/new",
  "/admin/vouchers",
  "/admin/vouchers/new",
  "/admin/recipes",
  "/admin/recipes/new",
  "/admin/articles",
  "/admin/articles/new",
  "/admin/staff",
  "/admin/audit",
];

/** Each page's violations, as "path: rule (how many)", for one clear diff. */
async function sweep(page: Page, paths: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const path of paths) {
    await page.goto(path, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    for (const v of violations) {
      found.push(`${path}: ${v.id} (${v.nodes.length}) ${v.help}`);
    }
  }
  return found;
}

for (const scheme of ["light", "dark"] as const) {
  test(`shop pages, ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    const details = (
      await Promise.all([
        hrefFrom(page, "/c/dairy-and-eggs/milk", "/p/"),
        hrefFrom(page, "/recipes", "/recipes/"),
        hrefFrom(page, "/articles", "/articles/"),
      ])
    ).filter((h): h is string => h !== null);
    expect(await sweep(page, [...SHOP, ...details])).toEqual([]);
  });

  test(`Customer pages, ${scheme}`, async ({ browser }) => {
    const page = await signInAs(browser, "Client");
    await page.emulateMedia({ colorScheme: scheme });
    expect(await sweep(page, ACCOUNT)).toEqual([]);
  });

  test(`staff pages, ${scheme}`, async ({ browser }) => {
    const page = await signInAs(browser, "Admin");
    await page.emulateMedia({ colorScheme: scheme });
    const details = (
      await Promise.all([
        hrefFrom(page, "/admin/products", "/admin/products/"),
        hrefFrom(page, "/admin/stock", "/admin/stock/"),
      ])
    ).filter((h): h is string => h !== null);
    expect(await sweep(page, [...ADMIN, ...details])).toEqual([]);
  });
}

/** The first link in `main` under `prefix` on a list page, or null. */
async function hrefFrom(page: Page, list: string, prefix: string) {
  const probe = await page.context().newPage();
  await probe.goto(list, { waitUntil: "networkidle" });
  const hrefs = await probe
    .locator("main a[href]")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  await probe.close();
  return (
    hrefs.find(
      (h) =>
        h.startsWith(prefix) && h.length > prefix.length && !h.endsWith("/new")
    ) ?? null
  );
}
