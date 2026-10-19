# Roadmap and build plan

Status: v0.2, 2026-10-17. This is the build plan: what we build, in which order, in which batch, with which tools. Tick items as they are finished. A phase is **done only when every exit criterion is observably met** (run the app and exercise the flow; passing tests alone are not enough).

Estimates assume **one full-time developer working with Claude Code**, starting **Monday 19 October 2026**. Dates are indicative and show order and size, not promises. A batch is 2 to 5 working days and should land as **one pull request**.

## 1. Timeline at a glance

| Weeks      | Dates (2026 to 2027) | Phase                        | Milestone at the end                                                  |
| ---------- | -------------------- | ---------------------------- | --------------------------------------------------------------------- |
| W1         | 19 to 23 Oct         | Phase 0: Foundation          | Empty app deployed with tokens, database, sign-in shell and CI        |
| W2 to W4   | 26 Oct to 13 Nov     | Phase 1: Catalogue           | **M1** Storefront browsable and searchable; admin can import Products |
| W5 to W7   | 16 Nov to 4 Dec      | Phase 2: Cart, checkout, COD | **M2** First cash-on-delivery Order placed and tracked on a phone     |
| W8 to W9   | 7 to 18 Dec          | Phase 3: Online payments     | **M3** GCash and card payments working in sandbox                     |
| W10 to W11 | 21 Dec to 1 Jan      | Holiday buffer               | Catch-up, fixes, docs; no new features                                |
| W12 to W14 | 4 to 22 Jan          | Phase 4: Operations          | **M4** Hub dry run with 20 Orders, no developer help                  |
| W15 to W17 | 25 Jan to 12 Feb     | Phase 5: Growth (V1)         | **M5** Recipes, Vouchers, Claims, PWA, Filipino                       |
| W18 to W19 | 15 to 26 Feb         | Phase 6: Launch hardening    | **M6** Security, accessibility, load and legal sign-off               |
| W20 to W21 | 1 to 12 Mar          | Soft launch                  | One Zone, friends and family, fix list                                |
| W22        | from 15 Mar          | Public launch                | **M7** Open to all Zones                                              |

The MVP (PRD scope) is Phases 0 to 4. Phase 5 is V1. Business tracks run alongside and can block technical phases: see section 11.

## 2. Tech stack and where it is used

Versions are not pinned here; Phase 0 installs the latest stable releases and the lockfile becomes the record.

| Layer           | Choice                                                                                      | What it does for us                                                                                                                            | First used                                      |
| --------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Language        | TypeScript                                                                                  | One language across UI, server logic and tests                                                                                                 | Phase 0                                         |
| Framework       | Next.js (App Router), React                                                                 | Storefront, account, checkout, admin and API in one deployable ([ADR 0001](adr/0001-modular-monolith-nextjs.md)); Server Components by default | Phase 0                                         |
| Styling         | Tailwind CSS v4 with the v2 tokens                                                          | Colours, type, radii from [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md) as semantic utilities                                                     | Phase 0                                         |
| Components      | shadcn/ui (customised, never default)                                                       | Accessible primitives: dialog, sheet, drawer, select, tabs, toasts                                                                             | Phase 0 install, Phase 1 onward                 |
| Animation       | Motion (`motion/react`)                                                                     | Add-to-stepper morph, count bump, cart sheet springs; leaf client components only                                                              | Phase 1 and 2                                   |
| Icons and fonts | Phosphor; Epilogue, Plus Jakarta Sans, Geist Mono via `next/font`                           | One icon family; fonts include the peso sign                                                                                                   | Phase 0                                         |
| Forms           | React Hook Form + Zod                                                                       | Same Zod schema validates in the browser and in Server Actions                                                                                 | Phase 1 admin, Phase 2 checkout                 |
| Server logic    | Server Actions + route handlers                                                             | Mutations call module interfaces; route handlers for webhooks, cron and health                                                                 | Phase 0 onward                                  |
| Database        | PostgreSQL on Neon ([ADR 0005](adr/0005-neon-postgres-host.md)), one branch per environment | Catalogue, carts, stock, Orders, payments                                                                                                      | Phase 0                                         |
| ORM             | Prisma                                                                                      | Schema, migrations, typed queries; raw SQL for guarded atomic updates ([ADR 0004](adr/0004-postgres-prisma.md))                                | Phase 0                                         |
| Search          | Postgres full-text + `pg_trgm` + `unaccent` behind `SearchIndex`                            | Typo-tolerant search for "gatas", "milk" and misspellings                                                                                      | Phase 1                                         |
| Money           | Integer centavos, `lib/money.ts`                                                            | No floating-point money anywhere ([ADR 0002](adr/0002-money-as-integer-centavos.md))                                                           | Phase 0                                         |
| Auth            | Better Auth                                                                                 | Customer OTP, email magic link, Google; staff roles                                                                                            | Phase 0 shell, Phase 2 Customers, Phase 4 staff |
| Payments        | Xendit or PayMongo behind `PaymentProvider`                                                 | GCash, cards, refunds via hosted checkout ([ADR 0003](adr/0003-payment-provider-interface.md))                                                 | Phase 3                                         |
| Email           | Resend + React Email                                                                        | Order confirmations and updates as component templates                                                                                         | Phase 2                                         |
| SMS             | Semaphore or Twilio behind `notifications`                                                  | OTP, order and Substitution messages                                                                                                           | Phase 2                                         |
| Media           | Object storage + CDN, `next/image`                                                          | Product photos converted to WebP/AVIF at the right sizes                                                                                       | Phase 1                                         |
| Maps            | Geocoding and map pin provider                                                              | Address pin and Zone check                                                                                                                     | Phase 2                                         |
| Jobs            | `jobs` table + Vercel Cron calling `/api/cron/[job]`                                        | Expire holds and unpaid Orders, retry notices, reminders                                                                                       | Phase 2                                         |
| Rate limits     | Postgres table (ADR 0006)                                                                   | OTP, login and checkout limits                                                                                                                 | Phase 2                                         |
| Admin tables    | TanStack Table                                                                              | Dense, sortable admin lists                                                                                                                    | Phase 1                                         |
| i18n            | `next-intl`                                                                                 | Filipino language pass                                                                                                                         | Phase 5                                         |
| PWA             | Web manifest + service worker                                                               | Installable app, offline-friendly cart and browse shell                                                                                        | Phase 5                                         |
| Tests           | Vitest, Testing Library, Playwright, axe-core, Lighthouse CI                                | Unit, integration on a real test DB, E2E journeys, accessibility, performance budgets                                                          | Phase 0 onward                                  |
| Code quality    | ESLint, Prettier, Husky, lint-staged, `tsc`                                                 | Formatting, linting and type checks before every commit and in CI                                                                              | Phase 0                                         |
| Hosting         | Vercel (Singapore region) with preview deployments                                          | Every pull request gets its own preview and DB branch                                                                                          | Phase 0                                         |
| Monitoring      | Sentry, uptime monitor, Vercel Analytics                                                    | Errors, uptime, funnel                                                                                                                         | Phase 0 (Sentry), Phase 5 and 6                 |
| Mobile          | PWA now; native Flutter app is a frozen concept                                             | See [concepts/flutter-mobile](concepts/flutter-mobile/README.md)                                                                               | After launch, only if triggered                 |

## 3. How every batch is worked

1. **Plan:** read the batch, the PRD requirement IDs and the module map; shape interfaces with `codebase-design` (or the `Plan` agent for bigger batches).
2. **Test first** for pricing, cart, inventory, orders, payments and webhooks (`tdd`), against the real test database.
3. **Build** the slice end to end; UI work starts with `design-taste-frontend` and the v2 mockup; animation with `motion` and `apple-design`.
4. **See it run:** `run` skill or `playwright-cli` screenshots at 1440 and 390 px, light and dark; axe check on new pages.
5. **Review:** `code-review` and `simplify`; `security-review` for anything touching auth, payments or personal data.
6. **Ship:** one branch, one pull request (`pr` skill), CI green, preview checked, merge; tick the items here.

## 4. Decisions due along the way

| Decision                                                        | Options                                                                                       | Decide in   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- |
| Postgres host                                                   | **Decided: Neon**, see [ADR 0005](adr/0005-neon-postgres-host.md)                             | Done        |
| Object storage and CDN                                          | Default Cloudflare R2 ([06-SETUP.md](06-SETUP.md)); alternatives Vercel Blob, S3 + CloudFront | Batch 1.4   |
| Maps and geocoding                                              | Google Maps, Mapbox or similar                                                                | Batch 2.3   |
| SMS provider                                                    | Semaphore or Twilio                                                                           | Batch 2.5   |
| Rate-limit store                                                | Postgres-based, decided in [ADR 0006](adr/0006-postgres-rate-limit-store.md)                  | Batch 2.6   |
| Payment provider                                                | Xendit or PayMongo (sandbox evaluation)                                                       | Batch 3.1   |
| Weighed-item charging                                           | Card hold plus capture; wallet charge plus refund                                             | Batch 3.3   |
| Discounts, free-delivery Vouchers, thresholds after Picking     | **Decided ahead**, see [ADR 0007](adr/0007-pricing-rules-ahead-and-tax-to-confirm.md)         | Done        |
| VAT registration and Tax Class per Category                     | Accountant answers ADR 0007 "To confirm" items 1 and 2                                        | Batch 4.4   |
| Real Delivery Fees, Free-Delivery Thresholds and Order Minimums | Owner replaces the seed amounts, ADR 0007 item 3                                              | Soft launch |
| Senior Citizen and PWD discount                                 | Accountant: required for online sales at launch? ADR 0007 item 4                              | Phase 6     |
| PWA tooling and push                                            | Service worker library; whether to send web push                                              | Batch 5.5   |
| Load-test tool                                                  | k6, Artillery or similar                                                                      | Batch 6.1   |

Record each hard-to-reverse choice as an ADR with `domain-modeling`.

## 5. Phase 0: Foundation (W1, 19 to 23 Oct)

**Goal:** an empty but real app: deployed, styled with our tokens, connected to a database, with sign-in and quality gates in place.

**Batch 0.1 Scaffold and quality gates** (days 1 and 2). Stack: Next.js, TypeScript, ESLint, Prettier, Husky, lint-staged. Skills: `setup-pre-commit`, `git-guardrails-claude-code`.

- Deferred, not a task: accounts and business tracks, by owner decision (2026-10-17, see [section 11](#11-business-tracks-run-alongside)). Until the Neon, Vercel, Sentry and Google accounts exist: local Postgres in Docker ([06-SETUP.md](06-SETUP.md) section 6), CI on GitHub Actions only
- [x] Repo-local `git config core.autocrlf input` set; `.gitattributes` committed
- [x] Scaffold Next.js app and merge into repo ([06-SETUP.md](06-SETUP.md) section 3)
- [x] Husky, lint-staged, Prettier; git guardrails
- [x] ESLint rule restricting imports into `modules/*/internal`
- [x] Vitest and Playwright configured with one passing test each

**Batch 0.2 Design foundation** (days 2 and 3). Stack: Tailwind v4, shadcn/ui, Motion, Phosphor, `next/font`. Skills: `design-taste-frontend`.

- [x] Install Phase 0 libraries (react-hook-form, zod and `@hookform/resolvers` deferred to Batch 1.4, see [06-SETUP.md](06-SETUP.md) section 4); configure Tailwind v4 with design tokens (light and dark) copied from `mockup-v2/hoshimono.css`
- [x] Epilogue and Plus Jakarta Sans via `next/font` (`latin` + `latin-ext` for the peso sign), Geist Mono for codes; Phosphor icons; Motion installed
- [x] `src/config/brand.ts`, `z.ts`, layout shell: header, footer, `DeliveryButton` placeholder, theme toggle

**Batch 0.3 Data and money** (days 3 and 4). Stack: Postgres, Prisma. Skills: `tdd`, `codebase-design`.

- [x] Prisma schema v0 from [04-DATA-MODEL.md](04-DATA-MODEL.md); first migration with `pg_trgm`, `unaccent`
- [x] Seed script (deterministic): 1 Hub, 3 Zones, ~40 categories, ~150 Products, staff and test Customers
- [x] `lib/money.ts` with tests (parse, format, add, percentage) per [ADR 0002](adr/0002-money-as-integer-centavos.md)

**Batch 0.4 Identity, health and deploy** (days 4 and 5). Stack: Better Auth, Vercel, Sentry, GitHub Actions. Skills: `run`, `playwright-cli`.

- [x] Identity shell: sign-in page (email magic link; links go to the dev server log until Batch 2.5), `requireCustomer`, `requireStaff(role)`
- [x] `/api/health` with DB check
- [x] CI workflow (`.github/workflows/ci.yml`), green on its first run in PR #2
- [ ] Vercel project with preview deployments; Sentry connected (blocked: accounts deferred)

**Exit criteria:** the six checks in [06-SETUP.md](06-SETUP.md) section 9 pass.

## 6. Phase 1: Catalogue (W2 to W4, 26 Oct to 13 Nov)

**Goal:** Customers can browse, search and read every Product; staff can load and edit the catalogue without a developer. The Add button is built with all its states here and wired to the Cart in Phase 2.

**Batch 1.1 Catalogue core and search** (W2). Stack: Prisma, Postgres full-text, `pg_trgm`, `unaccent`. Skills: `codebase-design`, `tdd`.

- [x] `catalog` module: `getProduct`, `listProducts`, `searchProducts`, `getCategoryTree`
- [x] Search: full-text plus trigram, suggestions, zero-result state (backend and `SearchIndex` interface); Filipino synonyms and typo correction, see [03-ARCHITECTURE.md](03-ARCHITECTURE.md) section 10

**Batch 1.2 Storefront shell and Home** (W2 to W3). Stack: Server Components, Tailwind, shadcn/ui, Motion, `next/image`. Skills: `design-taste-frontend`, `motion`.

- [x] Home page v1 following [mockup v2](mockup-v2/README.md): hero, service strip, category mosaic, product grid, delivery button
- [x] `ProductCard`, `PriceTag`, `QuantityStepper`, `StockBadge` with every state (default, hover, focus, loading, out of stock); Add keeps a local quantity until Batch 2.2
- [x] Skeletons, empty and error states on every list

**Batch 1.3 Category, Product and Search pages** (W3). Stack: Server Components, structured data. Skills: `design-taste-frontend`.

- [x] Category page with filters and sort; Unit Price computed and shown
- [x] Product page with images, details, allergens, related Products, structured data
- [x] Search page with suggestions and zero-result guidance

**Batch 1.4 Admin catalogue** (W3 to W4). Stack: TanStack Table, React Hook Form + Zod, object storage + CDN. Skills: `anthropic-skills:xlsx` for the import template, `tdd` for CSV validation.

- [x] Admin: Product list, create/edit, image upload, status, bulk CSV import/export with validation report (plain server-rendered table instead of TanStack Table; react-hook-form not needed)
- [x] Admin: Category tree editor
- [x] Image pipeline: upload, convert to WebP/AVIF, sizes, CDN (1200 px WebP master, next/image serves AVIF/WebP sizes; storage is local disk behind `MediaStore` until the R2 account exists)

**Batch 1.5 SEO and performance** (W4). Stack: Next.js metadata, sitemaps, Lighthouse CI, axe-core. Skills: `playwright-cli`, `run`.

- [x] Sitemaps (static, products), `robots.txt`, canonical URLs, Open Graph images
- [x] Tag-based revalidation so admin edits reach the storefront within a minute (`updateTag` in every admin action: immediate)
- [ ] Lighthouse budget met on Home, Category, Product. Not yet: mobile performance 85 to 87 (Home), 81 to 87 (Category), 85 to 88 (Product) against `next start` on localhost; accessibility, best practices and SEO 100 on all three. The Product and Category headings now render in the page shell instead of a streamed Suspense segment (Product was 79), so first paint is the LCP. The rest is a localhost effect: scripts arrive at once and run before Chrome's first paint, so the simulated LCP counts all JavaScript. JavaScript cut from 203 to 189 KB (LazyMotion, no Radix or cn on storefront client code). Next: measure on a clean CI runner or Vercel preview, then self-host fonts subset to Latin plus U+20B1 with `next/font/local` (docs/05 section 11)

**Exit criteria:** a non-developer imports a 500-row CSV, edits a Product in admin, and sees the change on the storefront within a minute; search finds "gatas" and "milk" and tolerates one typo; Lighthouse performance 90+ on mobile profile for the three key pages.

## 7. Phase 2: Cart, checkout and cash on delivery (W5 to W7, 16 Nov to 4 Dec)

**Goal:** a Customer can fill a Cart, choose a Slot, place a cash-on-delivery Order and track it, with no overselling under load.

**Batch 2.1 Pricing core** (W5). Stack: pure TypeScript, Vitest. Skills: `tdd`, `grilling` for VAT and rounding rules.

- [x] `pricing.priceCart` built test-first, covering rounding, VAT split, Promotions stub, minimums, free-delivery threshold

**Batch 2.2 Cart** (W5). Stack: Server Actions, a hashed random cookie token, Motion. Skills: `tdd`, `apple-design`, `motion`.

- [x] `cart` module: guest cart cookie, merge on sign-in, quantity limits, price/stock change flags
- [x] Cart UI: drawer, full page, `QuantityStepper`, `SubstitutionSelect`, Weighed Product notes (optimistic updates, server reconciliation)

**Batch 2.3 Delivery and addresses** (W6). Stack: atomic SQL updates, maps and geocoding. Skills: `tdd`, `codebase-design`.

- [x] `delivery` module: Zone resolution, Slot listing, 10-minute holds, atomic booking
- [x] Address book with landmark and Zone coverage check (`customers` module, `/account/addresses`). Map pin deferred until a maps provider is chosen; Zones match by city and barangay name

**Batch 2.4 Inventory and orders** (W6). Stack: Postgres transactions, guarded `UPDATE ... WHERE`. Skills: `tdd`.

- [x] `inventory` module: availability, atomic reserve/release, movements log
- [x] `orders` module: `placeOrder` (idempotent), status machine, history events
- [x] Concurrency tests: two checkouts competing for the last unit and the last Slot

**Batch 2.5 Checkout, confirmation and notices** (W7). Stack: React Hook Form + Zod, Resend + React Email, SMS provider, Vercel Cron. Skills: `design-taste-frontend`.

- [x] Checkout page: Address, Slot, contact, COD, summary, server re-pricing (forms use `useActionState`; React Hook Form stays deferred, see 06-SETUP)
- [x] Order confirmation page and tracking page (`/checkout/confirmed/[orderNo]`, `/orders/[orderNo]`, cancel before picking)
- [x] `notifications`: order confirmed email and SMS through console providers and a delivery log. Resend and the SMS sender plug in when those accounts exist (business tracks)
- [x] Jobs table and cron: `/api/cron/tick` purges Slot holds, cancels unpaid online Orders and runs the jobs outbox (`vercel.json`, `CRON_SECRET`)

**Batch 2.6 Accounts and the full journey** (W7). Stack: Better Auth, rate-limit store, Playwright. Skills: `security-review`, `playwright-cli`.

- [x] Customer sign-in: mobile OTP, email magic link, Google, with rate limits (PRD ACC-1). OTP texts go through the console SMS provider and Google shows once its OAuth keys are set (business tracks); limits in Postgres ([ADR 0006](adr/0006-postgres-rate-limit-store.md))
- [x] Account area: profile, addresses, order history, cancel before picking
- [x] Playwright journey: browse, add, checkout as guest then sign in, place COD order, see tracking (`e2e/checkout.spec.ts`, phone viewport; CI `e2e` job)

**Exit criteria:** a Customer places and tracks a COD order on a phone; two simultaneous buyers of the last item result in exactly one Order; the total on the confirmation page equals the total computed by `priceCart` to the centavo; the E2E journey is green in CI.

**Checkpoint and cut order.** This is the heaviest phase (six batches in three weeks). At the end of W6, Batches 2.1 to 2.4 must be green, including the concurrency tests. If they are not, cut in this order. Every cut item moves to the holiday buffer (section 9), so MVP scope and the Phase 3 and 4 dates do not change; anything still unfinished at the end of W11 is an owner decision on MVP scope, not a silent drop.

1. Account area polish: order history timeline, receipt and Reorder (PRD ACC-3).
2. Sign-in methods beyond the first working one (PRD ACC-1). If the SMS sender ID is late, ship email magic link and Google first and move mobile OTP.

Never cut: server re-pricing, atomic stock reservation, atomic Slot booking, the concurrency tests, cancel before picking (PRD ACC-5).

**Review of Phases 1 and 2** (18 Oct, PR #5). Reviewers checked both phases. Every confirmed finding that needs no outside account is fixed:

- [x] Security: open redirect after sign-in closed (`safeNext`); cron secret compared in constant time; text-message codes limited per number and IP, per number (10 an hour) and on verify; new Guest Carts limited to 60 per IP an hour; console senders and the dev mailbox can never run on a real domain (`src/lib/test-mode.ts`)
- [x] Admin: CSV import keeps columns missing from the file, matches by slug, brand and name, or name alone, skips blank rows and checks barcodes; audit entries carry before and after values; saving keeps the Unit Price basis; price capped at PHP 100,000; photo uploads up to 10 MB, padded to square instead of cropped; forms keep a select's value after an error
- [x] Orders: `placeOrder` re-checks the Cart version inside its transaction and retries deadlocks; COD limited to 3 open Orders and PHP 20,000 an Order; Slot holds and bookings check the Hub and a 7-day window; cancelling releases the Slot, the stock and the COD Payment (new `payments` module); no delivery fee when nothing is priced; the VAT split includes the fee; weighed items say "about" and show an estimated total
- [x] Cart and Checkout: writes lock the open Cart; archived lines can be removed; an older Cart view never overwrites a newer one; a late Slot answer cannot replace a newer choice; "Held for you until" with expiry; inline address step; an address in another Zone re-prices the Order
- [x] Ops: cron steps run in isolation with logged errors; purge of idle Guest Carts, old checked-out Carts and finished jobs (partial indexes); Vercel region `sin1`
- [x] Storefront: filters and sort keep each other; pages past the end redirect; 44 px Cart controls and 16 px fields; long-press stepper; search keeps text typed before hydration; Cart drawer as a sheet with a delivery row; `/delivery` coverage page; copy says cash on delivery only
- [x] Performance: Product and Category headings render in the page shell (Lighthouse Product 79 to 85-88). Both pages set `instant = false`, so a Product or Category added after the build renders on its first visit without a skeleton
- [x] Tests: CI runs e2e against a production build (`E2E_PROD=1`); 220 Vitest tests and 41 Playwright tests green on the dev server and the production build
- [x] Docs: Glossary adds Guest Cart, Picker Note, Order Number, Slot Hold and Slot Cutoff; docs 03, 04 and 05 match the code

Refuted during verification, so not changed: weighed items sold per piece (unreachable), the Order text to an unverified number, `x-forwarded-for` spoofing. What is still open is in the carry-over list in section 9.

## 8. Phase 3: Online payments (W8 to W9, 7 to 18 Dec)

**Goal:** GCash and card payments that can never double-charge or lose an Order.

**Batch 3.1 Provider and ledger** (W8). Stack: Xendit or PayMongo SDK, route handlers. Skills: `research`, `tdd`, `domain-modeling`.

- [ ] Provider chosen after sandbox evaluation; [ADR 0003](adr/0003-payment-provider-interface.md) updated
- [ ] `PaymentProvider` adapter: create checkout, verify webhook, parse event, capture, refund
- [ ] `payment_events` ledger with unique provider event id; duplicate-webhook tests

**Batch 3.2 Checkout integration** (W8 to W9). Stack: hosted checkout, cron. Skills: `tdd`, `playwright-cli`.

- [ ] Hosted checkout redirect and return page that waits for the webhook, never trusting the redirect
- [ ] 15-minute unpaid-order expiry job
- [ ] Failure UX: declined card, abandoned wallet, expired session; cart preserved

**Batch 3.3 Weighed items and refunds** (W9). Skills: `grilling`, `security-review`.

- [ ] Weighed-item handling per [03-ARCHITECTURE.md](03-ARCHITECTURE.md) section 8 (decision closed and documented)
- [ ] Refund flow (full, partial) with Customer notification
- [ ] Sandbox end-to-end tests for GCash and card

**Exit criteria:** in sandbox, a paid order moves to confirmed only after a verified webhook; replaying the same webhook ten times changes nothing; a declined payment returns the Customer to Checkout with the Cart intact; a partial refund updates the ledger and the Order.

## 9. Holiday buffer (W10 to W11, 21 Dec to 1 Jan)

No new features over Christmas and New Year. Use the time for bugs from Phases 0 to 3, test gaps, docs and the business tracks (Hub fit-out, Rider hiring, BIR registration). This is also where items cut from Phase 2 land (see the cut order in section 7).

**Carried over from the Phase 1 and 2 review** (18 Oct):

- [ ] Lighthouse 90+ on mobile for Home, Category and Product (Batch 1.5). No longer blocked: the CI `lighthouse` job measures a production build on a clean runner (`lighthouserc.json`; performance warns until it passes). First clean-runner run (19 Oct, PR #8): Category 93, 98, 98 and Product 94, 94, 98 meet the budget; Home 72, 74, 98 does not, with about 1.1 s of total blocking time. Local laptop medians were 79, 81 and 85; accessibility, best practices and SEO 100. Cause, measured on Phase 1: about 190 KB of JavaScript runs before the first paint and the simulated phone charges it to LCP; with JavaScript blocked the pages score 96 to 99, with fonts blocked only a few points better, so subset fonts alone cannot reach 90. Fix, Home first: the Add button arrives as server HTML and loads the stepper and Motion on first tap; header search loads on first use. Then switch the CI assertion from warn to error. 19 Oct: Motion moved out of the first load and the header renders one SearchBox; JavaScript fell from 192 to 157 KB (Home), 200 to 164 KB (Category, under the 170 KB budget) and 192 to 157 KB (Product). Open: confirm Home 90+ on the CI runner, then switch the assertion to error
- [ ] Real 404 status for a missing Product or Category. Today the page streams a noindex not-found page with status 200, because Next 16 cannot call `notFound()` in the shell for on-demand params; recheck on each Next upgrade
- [ ] R2 `MediaStore`: uploaded photos show only in development, because `next start` serves `public/` as it was at start. Blocked: Cloudflare account
- [ ] Cart drawer spring and detents with Motion, as docs/05 specifies (vaul's own transition for now)
- [ ] Cart drawer delivery row shows the held Slot, not a generic line
- [x] Unit test for the Order attempt rate-limit keys (10 an hour per account, 20 per IP)
- [ ] Frontend and design review of the Phase 1 and 2 screens (that reviewer did not run in the review round)
- [ ] Real providers: Resend email, SMS sender for codes and Order texts, Google sign-in keys, a maps pin for addresses, Vercel preview, Neon and Sentry (Batch 0.4). Blocked: accounts (section 11)

**Review: what reads as AI-made** (18 Oct). Senior engineer, senior frontend and UI/UX reviewers looked at the running app (desktop, phone, dark mode, admin) and the code for signs a human expert would not leave. The core is senior-grade: stock and Slot races, idempotent `placeOrder`, money in centavos, enforced module boundaries, forms that work without JavaScript. The tells are on the surface: build-process comments, near-duplicate copies, fixes layered on fixes, and a placeholder-heavy template look.

UI and UX:

- [ ] Placeholders: every Product, the hero and the category tiles show one striped box with a mismatched line icon (cheese and yogurt get a basket; avocado, calamansi and mango share one icon). Until real photos arrive (business track), drop the empty hero box and make cards text-first with quieter placeholders
- [ ] Home follows the stock AI landing formula: highlighted last word, one pill button, image on the right, three equal feature tiles, mostly empty category tiles. Rework with `design-taste-frontend`
- [ ] Product page: quantity stepper and a large "Add to cart" as in `mockup-v2/product.html`, the next Slot and delivery fee, the substitution choice; "Ingredients and allergens" shows only allergens
- [ ] Checkout without an address shows no order summary or total: show it from the start; do not pre-tick "Use this address by default" on the first address; put the coverage note next to City
- [ ] Phone Category page: header, chips, heading, sort and filters push the first Product below the fold
- [ ] Admin: its own shell without the shopper header (cart, "Deliver to"); status badges in words, not raw values like `active`
- [ ] Small tells: straight quotes in `Results for "gatas"`; "Showing 1 to 6 of 6" on a single page; the name pre-filled from the email; a footer with no help, terms or contact; the lime banner at full brightness in dark mode; a generic letter-in-a-circle logo

Engineering:

- [x] Strip build-process comments: about 100 cite a Batch, Phase, PRD, ADR or "review finding"; also a migration named for review fixes and a test group "confirmed by a skeptic". Keep only the why
- [ ] Search: category topics guessed from `LIKE '% and %'` on names, a four-stage fallback and a JS edit distance beside `pg_trgm`. Store topics as data and lean on `pg_trgm` and `unaccent`
- [x] One guard per risk: `createProduct` pre-checks, catches P2002 and string-matches the error; `GREATEST(reserved - q, 0)` and `booked > 0` silently hide stock and Slot accounting bugs, so make them fail loudly
- [x] One helper each: UUID checks (five versions), audit writes (two that treat `null` differently), the e2e mailbox (two), brand plus name (five), the test `TRUNCATE` (two); `addMinutes` and `addDays` in `lib/dates`
- [x] Limits in one place: the cart action accepts `.max(999)` while `MAX_LINE_QUANTITY` is 99; `days ?? 7` beside `BOOKING_DAYS`; the 30-day retention written three times; "5 minutes" in the code text beside `expiresIn: 300`
- [ ] One result convention for module errors (six today); log every caught error (sign-in turns a database outage into "wrong code"). Logging done 19 Oct: sign-in tells an outage from a wrong code, and the health check and sign-in actions log what they catch. The result convention is still open
- [x] Code ahead of its feature: the cron step expiring `pending_payment` Orders that nothing creates, `PAYMENT_WINDOW_MINUTES`, `percentOf`, `getZone`. Delete until Phase 3
- [x] `modules/identity/index.ts` holds logic: move it to `internal/`, keep the index as re-exports, rename one of the two `sendSignInCode`
- [x] Admin writes and their audit row in one transaction (one `adminWrite` helper instead of seven copies)
- [x] Cron job handlers imported from `app/api/cron` by checkout and tests: move them to a server composition file; derive open statuses from the status machine
- [x] Tests: group search tests by behaviour, not review round, and drop seed counts; drop the e2e warm-up and `networkidle` waits now that CI tests a production build; the not-found test pins status 200; move `tests/guardrail.test.ts` (the agent's git hook) out of the app suite; delete the scaffold comment in `next.config.ts`. Done 19 Oct, except the `networkidle` waits: they hold clicks until React has hydrated, which auto-waiting does not cover; the warm-up now runs only against `next dev`

Frontend:

- [ ] Mockup pixels pasted as arbitrary classes (`text-[13px]` 30 times, `gap-[22px]`, `top-[136px]`) while the type tokens go unused: use the tokens, a `--header-h` variable for sticky offsets, and lint arbitrary values outside `ui/`
- [ ] One button system (`PRIMARY_BUTTON` copies Button; `secondary` equals `outline`) and one field (a 44 px `FIELD` string pasted about 14 times beside the 48 px `Input`); a RadioCard instead of the `border-2` with `px-[15px]` hack
- [x] Delete the 13 shadcn files in `components/ui/` that nothing imports (still in default style); remove the dark tokens pasted twice in `globals.css`
- [x] Long-press stepper sends a server action and a screen-reader announcement every 100 ms: count locally while held, send once on release
- [x] One SearchBox, one CategoryNav and one Filters form laid out with CSS, not rendered twice for phone and desktop. Done 19 Oct for SearchBox (it hydrated twice) and CategoryNav (one nav, sticky from md up). The Filters form stays twice on purpose: it is server-only, so the copy costs bytes, not hydration, and one form would need `::details-content`, which iOS before 18.4 lacks
- [ ] Return structured parts instead of parsing formatted text (`size.replace("approx. ", "")`, the Slot label split at ", ", `splitMoney`); needed before the Filipino pass
- [ ] Replace workarounds: the `CartSync` effect, the hidden `data-no-cart-bar` div (use a route-group layout), the WeakMap `formKey`
- [ ] Accessibility by design: screen readers read "Photo to come"; three skeleton patterns; the stepper's `<output>` and `announce()` both speak; filter rows and chips under 44 px; no `aria-current` on the active category. 19 Oct: the stepper `<output>` no longer speaks over the Cart announcement
- [x] Category page: one Suspense boundary instead of three with filler fallbacks; no skeleton on the redirect and not-found branches (both added in the Lighthouse fix)
- [ ] Copy: the sold-by-weight note is worded six ways; the voice avoids contractions and reads stiff

## 10. Phases 4 to 6 and launch

### Phase 4: Operations (W12 to W14, 4 to 22 Jan)

**Goal:** the Hub can pick, substitute, dispatch and reconcile a day of Orders without spreadsheets or developer help.

**Batch 4.1 Staff and order queue** (W12). Stack: Better Auth roles, TanStack Table. Skills: `security-review`.

- [ ] Staff roles and permissions (admin, merchandiser, picker, dispatcher); audit log
- [ ] Order queue with filters, search, status changes, notes

**Batch 4.2 Picking and Substitutions** (W12 to W13). Stack: mobile-first web views, SMS. Skills: `design-taste-frontend` (Picker rules in [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md) section 9), `tdd`.

- [ ] Picker view (mobile-first): aisle-ordered list, tick, mark short, propose Substitution, enter final weight
- [ ] Customer-side Substitution response (SMS link or app notice) with auto-accept on timeout
- [ ] Final amount recalculation and payment adjustment after picking

**Batch 4.3 Dispatch and cash on delivery** (W13). Stack: object storage for proof photos. Skills: `tdd`.

- [ ] Dispatch view: assign Rider, out for delivery, proof of delivery (photo or PIN), failed delivery
- [ ] COD collection and per-Rider reconciliation

**Batch 4.4 Stock, Zones and reports** (W14). Stack: TanStack Table, print stylesheets or PDF. Skills: `dataviz`, `anthropic-skills:pdf`.

- [ ] Stock: receipts, adjustments, shrink, low-stock list
- [ ] Zone, fee and Slot management UI
- [ ] Minimal daily report: orders, revenue, fill rate, late deliveries
- [ ] Printable pick sheets and delivery receipts (VAT breakdown)

**Exit criteria:** a Hub dry run with 20 real-looking Orders, one Picker and one Rider completes with no developer help, including three shorts, two Substitutions and one weighed adjustment; every status change appears in the order history.

### Phase 5: Growth, V1 (W15 to W17, 25 Jan to 12 Feb)

**Goal:** the features that make Customers come back: recipes, reorder, savings, Claims, an installable app and Filipino.

**Batch 5.1 Recipes** (W15). Stack: `content` module, `cart`. Skills: `design-taste-frontend`, `motion`.

- [ ] Recipes: admin editor, public pages, servings scaler, "Add all to cart"

**Batch 5.2 Retention** (W15 to W16). Stack: jobs, email and SMS with consent.

- [ ] Reorder from history; saved shopping lists; "Buy again" rail
- [ ] Abandoned-cart reminder (email/SMS with consent)
- [ ] Back-in-stock notifications

**Batch 5.3 Promotions, Vouchers and Referrals** (W16). Stack: `pricing`. Skills: `tdd`, `grilling`.

- [ ] Promotions and Vouchers with eligibility rules and usage caps
- [ ] Referral codes and rewards ledger

**Batch 5.4 Freshness Claims** (W16 to W17). Stack: object storage for photos, `payments.refund`. Skills: `tdd`.

- [ ] Freshness Claims with photo upload and resolution workflow

**Batch 5.5 PWA, Filipino and analytics** (W17). Stack: web manifest, service worker, `next-intl`, Vercel Analytics. Skills: `dataviz`.

- [ ] PWA: manifest, install prompt, offline-friendly cart and browse shell
- [ ] Filipino translation pass (`next-intl` or equivalent)
- [ ] Analytics events and funnel dashboard

**Exit criteria:** a Customer cooks from a Recipe in under a minute of cart-building; a Voucher cannot be applied twice or outside its rules; a Claim is filed, resolved and refunded end to end.

### Phase 6: Launch hardening (W18 to W19, 15 to 26 Feb)

**Goal:** prove the shop is fast, safe, accessible, legal and recoverable before real money flows.

**Batch 6.1 Performance and resilience** (W18). Stack: load-test tool, Sentry alerts, database backups.

- [ ] Load test checkout and Slot booking at 5x expected peak
- [ ] Monitoring and alerts: checkout error rate, webhook failures, job lag, Slot capacity
- [ ] Backups and a tested restore

**Batch 6.2 Security and accessibility** (W18 to W19). Skills: `security-review`, `playwright-cli` with axe-core.

- [ ] Security review (`security-review` skill), dependency audit, rate-limit tests, OTP abuse tests
- [ ] Accessibility audit (axe plus manual TalkBack and VoiceOver pass)

**Batch 6.3 Legal and go-live setup** (W19). Skills: `anthropic-skills:docx` or the docs skill for policies.

- [ ] Privacy policy, terms, refund policy, Tax and Business Compliance page, cookie consent
- [ ] Runbook: how to handle a stuck payment, a wrong refund, a Hub shutdown, a provider outage
- [ ] Production domain, email DNS (SPF, DKIM, DMARC), SMS sender

### Soft launch and public launch (W20 to W22, from 1 Mar)

- [ ] Soft launch to friends and family in one Zone for two weeks; daily fix list; then open (W20 to W21)
- [ ] Public launch to all Zones (W22)

**Exit criteria for Phase 6 and launch:** all non-functional targets in [01-PRD.md](01-PRD.md) section 7 are measured and met; restore drill completed; owner signs off after the soft launch with fewer than 3 Freshness Claims per 100 Orders.

### After launch (not scheduled)

- Native Flutter app for Customers, only if the triggers in [concepts/flutter-mobile](concepts/flutter-mobile/README.md) are met. The plan is frozen until then.

## 11. Business tracks (run alongside)

| Track                                          | Start | Needed by                        | Owner                |
| ---------------------------------------------- | ----- | -------------------------------- | -------------------- |
| Payment provider business verification         | W1    | Phase 3 (W8)                     | Owner                |
| Supplier agreements and price lists            | W1    | Phase 1 data load (W4)           | Owner                |
| Product photography plan (200 hero SKUs first) | W1    | Phase 1 (W4) for the first batch | Owner                |
| SMS sender ID registration                     | W2    | Phase 2 (W7)                     | Owner                |
| Business registration, BIR, VAT classification | W2    | Phase 4 receipts (W14)           | Owner and accountant |
| Hub lease, chillers, shelving, tote system     | W6    | Phase 4 dry run (W14)            | Owner                |
| Rider hiring or partner                        | W10   | Phase 4 dry run (W14)            | Owner                |
| Legal review of terms, privacy, refunds        | W15   | Phase 6 (W19)                    | Owner and lawyer     |

If a track slips past its "needed by" week, the dependent phase slips with it; do not launch payments, receipts or the dry run on placeholders.

**Owner decision, 2026-10-17:** accounts and business tracks start after most of the app is built, not in W1. The dates in section 1 assumed W1 starts. Each phase below is blocked until its track is done, and its dates move with the start:

- Phase 0 exit checks for a Vercel preview and Sentry: need those accounts.
- Phase 1 real data load: supplier price lists and photos.
- Phase 2 SMS and OTP: SMS sender ID registration.
- Phase 3 payments: payment provider KYC (can take weeks).
- Phase 4 receipts and dry run: BIR and VAT registration, Hub, Rider.
- Phase 6 launch: legal review, production domain, email DNS.

Until a track is done, build against seed data, sandboxes and `console` providers for email and SMS, and mark the dependent roadmap items as blocked.

## 12. Definition of done (every item)

1. Acceptance criteria written first and met; related requirement IDs from the PRD cited.
2. Tests: unit for logic, integration for database behaviour, E2E for the user journey it enables.
3. States covered: loading, empty, error, and the unhappy path.
4. Accessibility checklist in [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md) section 10 passed.
5. `npm run check` is green; no new lint suppressions without a comment.
6. Docs updated: glossary if a new term appeared, ADR if a hard-to-reverse decision was made, roadmap ticked.
7. Exercised in the running app, not only in tests.
