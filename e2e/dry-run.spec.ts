import { execSync } from "node:child_process";

import { expect, test, type Locator, type Page } from "@playwright/test";

import { signInAs as as } from "./sign-in";

// The Phase 4 dry run (docs/dry-run.md) as one test: the 20 Orders of
// prisma/dry-run.ts picked by one Picker, with three shorts, two
// Substitutions and one weighed line under its estimate, sent out with
// one Rider, delivered with each Customer's PIN, and the cash counted.
// About ten minutes, so it runs only with DRY_RUN=1, and on its own: it
// counts the Rider's cash for the day, which dispatch.spec.ts does too.
// `DRY_RUN=1 E2E_PROD=1 npx playwright test e2e/dry-run.spec.ts`
test.skip(!process.env.DRY_RUN, "Set DRY_RUN=1 to run the Hub dry run.");
test.describe.configure({ timeout: 1_200_000 });

type Run = { orderNo: string; plan: string; phone: string };

/** Places the Orders and reads the run sheet the seeder prints. */
function placeOrders(): Run[] {
  const out = execSync("npx tsx prisma/dry-run.ts", {
    env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL },
    encoding: "utf8",
  });
  return out
    .split("\n")
    .filter((l) => l.startsWith("SW-"))
    .map((line, i) => {
      const [orderNo, , , plan = ""] = line.trim().split(/\s{2,}/);
      const n = String(i + 1).padStart(2, "0");
      return { orderNo, plan, phone: `+6391755500${n}` };
    });
}

/** The last text sent to a phone that matches, once it arrives. */
async function textTo(page: Page, phone: string, match: RegExp) {
  let found: RegExpExecArray | null = null;
  await expect
    .poll(
      async () => {
        const res = await page.request.get(
          `/api/dev/mailbox?to=${encodeURIComponent(phone)}`
        );
        const text = res.ok()
          ? ((await res.json()) as { text: string }).text
          : "";
        found = match.exec(text);
        return found !== null;
      },
      { timeout: 60_000 }
    )
    .toBe(true);
  return found!;
}

async function short(line: Locator, found: number) {
  await line.getByRole("button", { name: "Short" }).click();
  await line.getByLabel("How many found?").fill(String(found));
  await line.getByRole("button", { name: "Save", exact: true }).click();
  await expect(line.getByText(/^Short: found/)).toBeVisible({
    timeout: 30_000,
  });
}

async function pickOrder(picker: Page, shopper: Page, run: Run) {
  const shortPlan = /^Short: (.+), found (\d+) of/.exec(run.plan);
  const subPlan = /^Substitute: (.+?) is out.*they say (yes|no)$/.exec(
    run.plan
  );
  const weighPlan = /^Weighed: (.+) packs ([\d,]+) g/.exec(run.plan);

  await picker.goto(`/admin/pick/${run.orderNo}`, { waitUntil: "networkidle" });
  await picker.getByRole("button", { name: "Start picking" }).click();
  const finish = picker.getByRole("button", { name: "Finish picking" });
  await expect(finish).toBeVisible({ timeout: 30_000 });

  const lines = picker.locator("main ol > li");
  for (let i = 0; i < (await lines.count()); i++) {
    const line = lines.nth(i);
    const name = (await line.locator("b").first().textContent())!;
    const grams = line.getByLabel("Packed weight (g)");
    if (await grams.count()) {
      const packed =
        weighPlan && name === weighPlan[1]
          ? weighPlan[2].replace(",", "")
          : (await grams.getAttribute("placeholder"))!;
      await grams.fill(packed);
      await line.getByRole("button", { name: "Save weight" }).click();
      const shown = Number(packed).toLocaleString("en-PH");
      await expect(line.getByText(`Done: ${shown} g`)).toBeVisible({
        timeout: 30_000,
      });
    } else if (shortPlan && name.includes(shortPlan[1])) {
      await short(line, Number(shortPlan[2]));
    } else if (subPlan && name.includes(subPlan[1])) {
      await short(line, 0);
      await line.getByRole("button", { name: "Offer substitute" }).click();
      await expect(
        line.getByText(/Waiting for the Customer until/)
      ).toBeVisible({ timeout: 30_000 });
      // The Customer answers from the link in their text.
      const [link] = await textTo(
        shopper,
        run.phone,
        /https?:\/\/\S+\/s\/[\w-]+/
      );
      await shopper.goto(link, { waitUntil: "networkidle" });
      await shopper
        .getByRole("button", {
          name: subPlan[2] === "yes" ? "Yes, send it" : "No, leave it out",
        })
        .click();
      await expect(shopper.getByRole("heading").first()).not.toHaveText(
        "Is this substitute okay?",
        { timeout: 30_000 }
      );
      await picker.reload({ waitUntil: "networkidle" });
      await expect(
        lines
          .nth(i)
          .getByText(
            subPlan[2] === "yes"
              ? "Accepted: pack it."
              : "They said no: leave it out."
          )
      ).toBeVisible();
    } else {
      await line.getByRole("button", { name: /^Found all \d+$/ }).click();
      await expect(line.getByText(/^Done: found all/)).toBeVisible({
        timeout: 30_000,
      });
    }
  }
  await finish.click();
  await expect(picker.getByText("Ready for the Rider")).toBeVisible({
    timeout: 30_000,
  });
}

test("a Hub day: 20 Orders picked, delivered and the cash counted", async ({
  browser,
}) => {
  const runs = placeOrders();
  expect(runs).toHaveLength(20);

  const picker = await as(browser, "Picker", true);
  const shopper = await (
    await browser.newContext({ serviceWorkers: "block" })
  ).newPage();
  for (const run of runs) await pickOrder(picker, shopper, run);

  // The Dispatcher sends every Order out with Jun.
  const dispatcher = await as(browser, "Dispatcher");
  await dispatcher.goto("/admin/dispatch", { waitUntil: "networkidle" });
  for (const run of runs) {
    const ready = dispatcher
      .getByRole("listitem")
      .filter({ hasText: run.orderNo });
    await ready.getByLabel("Rider").selectOption({ label: "Jun Dela Rosa" });
    await ready.getByRole("button", { name: "Send out" }).click();
    await expect(
      dispatcher
        .getByRole("region", { name: /Out now/ })
        .getByRole("link", { name: run.orderNo })
    ).toBeVisible({ timeout: 30_000 });
  }

  const shot = (page: Page, name: string) =>
    page.screenshot({ path: test.info().outputPath(name), fullPage: true });
  await shot(dispatcher, "dispatch.png");

  // Jun delivers each with the PIN from the Customer's text and the cash
  // due, which the form fills in.
  const rider = await as(browser, "Rider", true);
  await rider.goto("/admin/deliveries", { waitUntil: "networkidle" });
  await shot(rider, "deliveries.png");
  let cashCents = 0;
  for (const run of runs) {
    const [, pin] = await textTo(
      rider,
      run.phone,
      /this PIN at the door: (\d{4})/
    );
    const stop = rider.getByRole("listitem").filter({ hasText: run.orderNo });
    const due = (await stop
      .getByText(/^Collect ₱[\d,.]+ in cash$/)
      .textContent())!;
    cashCents += Math.round(Number(due.replace(/[^\d.]/g, "")) * 100);
    await stop.getByLabel("Customer's PIN").fill(pin);
    await stop.getByRole("button", { name: "Delivered" }).click();
    await expect(stop).toHaveCount(0, { timeout: 30_000 });
  }
  await expect(rider.getByText("Nothing to deliver right now.")).toBeVisible();

  // The Dispatcher counts Jun's cash: it matches what he collected.
  await dispatcher.goto("/admin/cash", { waitUntil: "networkidle" });
  const jun = dispatcher
    .getByRole("listitem")
    .filter({ hasText: "Jun Dela Rosa" });
  const peso = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
  }).format(cashCents / 100);
  await expect(jun).toContainText(`₱${peso}`);
  await shot(dispatcher, "cash.png");
  await jun.getByLabel("Cash counted (₱)").fill((cashCents / 100).toFixed(2));
  await jun.getByRole("button", { name: "Record count" }).click();
  await expect(jun).toContainText(
    `Counted ₱${peso} by Marites Aquino: matches.`,
    {
      timeout: 30_000,
    }
  );

  // Every status change is in each Order's history.
  const admin = await as(browser, "Admin");
  for (const run of runs) {
    await admin.goto(`/admin/orders/${run.orderNo}`, {
      waitUntil: "networkidle",
    });
    const history = admin.getByRole("region", { name: "History" });
    for (const status of [
      "Confirmed",
      "Picking",
      "Ready for the Rider",
      "On the way",
      "Delivered",
    ]) {
      await expect(history.getByText(status, { exact: true })).toBeVisible();
    }
  }

  // The day's report: 20 delivered, and the shorts lower the fill rate.
  await admin.goto("/admin/report", { waitUntil: "networkidle" });
  await shot(admin, "report.png");
  const today = admin.getByLabel(/^Numbers for /);
  await expect(today).toContainText("Delivered20");
  await expect(today).not.toContainText("Fill rate100%");
});
