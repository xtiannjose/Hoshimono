import { expect, type Page } from "@playwright/test";

/** Signs in through the real magic-link flow, reading the dev mailbox. */
export async function signIn(page: Page, email: string, next = "/account") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("status")).toContainText(email);
  const res = await page.request.get(
    `/api/dev/mailbox?email=${encodeURIComponent(email)}`
  );
  expect(res.ok()).toBe(true);
  const { url } = (await res.json()) as { url: string };
  await page.goto(url);
}
