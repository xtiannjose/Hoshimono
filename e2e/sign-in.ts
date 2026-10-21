import {
  devices,
  expect,
  type Browser,
  type Cookie,
  type Page,
} from "@playwright/test";

// One real sign-in per email per worker: sign-in links are rate limited
// (3 per address per 15 minutes), so later tests reuse the session cookie.
const sessions = new Map<string, Cookie[]>();

/** Signs in through the real magic-link flow, reading the dev mailbox. */
export async function signIn(page: Page, email: string, next = "/account") {
  const saved = sessions.get(email);
  if (saved) {
    await page.context().addCookies(saved);
    await page.goto(next, { waitUntil: "networkidle" });
    return;
  }
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("status")).toContainText(email);
  const res = await page.request.get(
    `/api/dev/mailbox?email=${encodeURIComponent(email)}`
  );
  expect(res.ok()).toBe(true);
  const { url } = (await res.json()) as { url: string };
  await page.goto(url);
  const cookies = await page.context().cookies();
  sessions.set(
    email,
    cookies.filter((c) => c.name.includes("better-auth"))
  );
}

/** A new browser signed in as one of the test accounts (/dev/sign-in). */
export async function signInAs(browser: Browser, label: string, phone = false) {
  const page = await (
    await browser.newContext(phone ? { ...devices["Pixel 7"] } : {})
  ).newPage();
  await page.goto("/dev/sign-in", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: `Sign in as ${label}` }).click();
  // Past the magic-link check too: leaving it early drops the session.
  await page.waitForURL((url) => !/^\/(dev|api)\//.test(url.pathname), {
    timeout: 45_000,
  });
  return page;
}
