// `next dev` compiles a route on its first request, and several first
// requests at once can fail with a 500. Compile the main routes one at a
// time before the tests run in parallel.
const ROUTES = [
  "/",
  "/c/dairy-and-eggs/milk",
  "/p/warm-up-00000000-0000-0000-0000-000000000000",
  "/search?q=milk",
  "/cart",
  "/checkout",
  "/orders/SW-000000-WARM",
  "/checkout/confirmed/SW-000000-WARM",
  "/sign-in",
  "/account",
  "/account/addresses",
  "/account/addresses/new",
  "/account/orders",
  "/admin",
];

export default async function warmUp() {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3100";
  for (const route of ROUTES) {
    await fetch(base + route, { redirect: "manual" }).catch(() => {});
  }
}
