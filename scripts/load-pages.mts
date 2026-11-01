// Shop pages under load (docs/load-test.md): 50 shoppers browsing Home,
// a Category, a Product and search for 30 seconds, without pausing.
// `npm run load:pages` against a running production server (`next start`);
// LOAD_BASE_URL picks another one, such as a preview deployment.

const BASE = process.env.LOAD_BASE_URL ?? "http://localhost:3000";
const PAGES = [
  "/",
  "/c/dairy-and-eggs/milk",
  "/p/magnolia-fresh-milk-bc26e049-2c53-66ff-9f64-305fdc870457",
  "/search?q=gatas",
  "/fil/c/fruit-and-vegetables",
];
const SHOPPERS = 50;
const SECONDS = 30;

const times: number[] = [];
const failures: Record<string, number> = {};
const stopAt = Date.now() + SECONDS * 1000;

async function shopper(n: number) {
  for (let i = n; Date.now() < stopAt; i++) {
    const path = PAGES[i % PAGES.length];
    const started = performance.now();
    try {
      const res = await fetch(BASE + path, { redirect: "manual" });
      await res.arrayBuffer();
      if (res.status !== 200) {
        failures[`${res.status} ${path}`] =
          (failures[`${res.status} ${path}`] ?? 0) + 1;
      }
    } catch (error) {
      failures[String(error)] = (failures[String(error)] ?? 0) + 1;
    }
    times.push(performance.now() - started);
  }
}

await Promise.all(Array.from({ length: SHOPPERS }, (_, n) => shopper(n)));
times.sort((a, b) => a - b);
const at = (p: number) =>
  Math.round(times[Math.ceil((p / 100) * times.length) - 1]);
console.log(
  `${times.length} pages in ${SECONDS} s (${(times.length / SECONDS).toFixed(1)}/s) ` +
    `by ${SHOPPERS} shoppers; p50 ${at(50)} ms, p95 ${at(95)} ms, ` +
    `p99 ${at(99)} ms, max ${at(100)} ms`
);
const failed = Object.values(failures).reduce((a, b) => a + b, 0);
console.log(failed ? `Failures: ${JSON.stringify(failures)}` : "No failures.");
if (failed) process.exitCode = 1;
