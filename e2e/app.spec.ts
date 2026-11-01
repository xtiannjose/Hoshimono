import { expect, test } from "@playwright/test";

import { signInAs } from "./sign-in";

// The installable app and the shopping funnel (ADR 0017).

test("the app can be installed: manifest, icons and service worker", async ({
  request,
}) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ start_url: "/", display: "standalone" });
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const res = await request.get(icon.src);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  expect((await request.get("/sw.js")).ok()).toBe(true);
});

test("the offline page says what still works, in each language", async ({
  page,
}) => {
  await page.goto("/offline");
  await expect(
    page.getByRole("heading", { name: "You're offline" })
  ).toBeVisible();
  await page.goto("/fil/offline");
  await expect(page.getByRole("heading", { name: "Offline ka" })).toBeVisible();
});

test.describe("with the service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("pages already seen open without a connection", async ({
    page,
    context,
  }) => {
    // Only a production build registers the service worker.
    test.skip(!process.env.E2E_PROD, "needs a production build");
    await page.goto("/c/dairy-and-eggs");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // The worker takes over on its first visit: load once more under it.
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Dairy and eggs" })
    ).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Dairy and eggs" })
    ).toBeVisible();
    await expect(
      page.getByText("You're offline. Prices and stock may have changed")
    ).toBeVisible();
    await page.goto("/c/frozen").catch(() => {});
    await expect(
      page.getByRole("heading", { name: "You're offline" })
    ).toBeVisible();
    await context.setOffline(false);
  });
});

test("the daily report counts the funnel's steps", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/c/dairy-and-eggs", { waitUntil: "networkidle" });
  // The view is counted by a beacon once the Product page opens.
  const counted = page.waitForResponse(
    (r) => r.url().endsWith("/api/events") && r.status() === 204
  );
  await page
    .getByRole("region", { name: "Products" })
    .getByRole("article")
    .first()
    .getByRole("link")
    .last()
    .click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 30_000 });
  await counted;

  const admin = await signInAs(browser, "Admin");
  await admin.goto("/admin/report");
  const viewed = admin
    .getByRole("table", { name: /Shopping funnel/ })
    .getByRole("row", { name: /Product pages viewed/ });
  await expect(viewed.getByRole("cell").first()).not.toHaveText("0", {
    timeout: 30_000,
  });
});
