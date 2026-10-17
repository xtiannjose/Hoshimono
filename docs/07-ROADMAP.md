# Roadmap

Status: draft v0.1. Tick items as they are finished. A phase is **done only when every exit criterion is observably met** (run the app and exercise the flow; passing tests alone are not enough). Estimates are rough weeks for one full-time developer working with Claude Code; treat them as ordering, not promises.

```
Phase 0  Foundation            1 wk    repo, tooling, design tokens, DB, auth shell
Phase 1  Catalogue             2-3 wk  browse, search, product pages, admin products
Phase 2  Cart, checkout, COD   3 wk    cart, pricing, slots, orders, tracking, notices
Phase 3  Online payments       2 wk    GCash and cards, webhooks, refunds
Phase 4  Operations            2-3 wk  admin queue, picker, substitutions, dispatch
Phase 5  Growth (V1)           3 wk    recipes, reorder, vouchers, referral, claims, PWA
Phase 6  Launch hardening      2 wk    load, a11y, security, legal, backups, soft launch
```

Business tracks run in parallel and gate the technical ones: see the end of this file.

## Phase 0: Foundation

- [ ] Scaffold Next.js app and merge into repo ([06-SETUP.md](06-SETUP.md) section 3)
- [ ] Install Phase 0 libraries; configure Tailwind v4 with design tokens (light and dark)
- [ ] `src/config/brand.ts`, `z.ts`, layout shell: header, footer, `DeliveryButton` placeholder, theme toggle
- [ ] Bricolage Grotesque and Plus Jakarta Sans via `next/font` (`latin` + `latin-ext` for the peso sign), Geist Mono for codes; Phosphor icons; Motion installed
- [ ] Prisma schema v0 from [04-DATA-MODEL.md](04-DATA-MODEL.md); first migration with `pg_trgm`, `unaccent`
- [ ] Seed script (deterministic): 1 Hub, 3 Zones, ~40 categories, ~150 Products, staff and test Customers
- [ ] `lib/money.ts` with tests (parse, format, add, percentage) per [ADR 0002](adr/0002-money-as-integer-centavos.md)
- [ ] Identity shell: sign-in page, `requireCustomer`, `requireStaff(role)`
- [ ] `/api/health` with DB check
- [ ] Vitest and Playwright configured with one passing test each
- [ ] Husky, lint-staged, Prettier; git guardrails
- [ ] ESLint rule restricting imports into `modules/*/internal`
- [ ] CI workflow; Vercel project with preview deployments; Sentry connected

**Exit criteria:** the six checks in [06-SETUP.md](06-SETUP.md) section 9 pass.

## Phase 1: Catalogue

- [ ] `catalog` module: `getProduct`, `listProducts`, `searchProducts`, `getCategoryTree`
- [ ] Home page v1 following [mockup v2](mockup-v2/README.md): hero, service strip, category mosaic, product grid, delivery button
- [ ] Category page with filters and sort; Unit Price computed and shown
- [ ] Product page with images, details, allergens, related Products, structured data
- [ ] Search: full-text plus trigram, suggestions, zero-result state
- [ ] Admin: Product list, create/edit, image upload, status, bulk CSV import/export with validation report
- [ ] Admin: Category tree editor
- [ ] Sitemaps (static, products), `robots.txt`, canonical URLs, Open Graph images
- [ ] Skeletons, empty and error states on every list
- [ ] Image pipeline: upload, convert to WebP/AVIF, sizes, CDN
- [ ] Lighthouse budget met on Home, Category, Product

**Exit criteria:** a non-developer imports a 500-row CSV, edits a Product in admin, and sees the change on the storefront within a minute; search finds "gatas" and "milk" and tolerates one typo; Lighthouse performance 90+ on mobile profile for the three key pages.

## Phase 2: Cart, checkout and cash on delivery

- [ ] `pricing.priceCart` built test-first, covering rounding, VAT split, Promotions stub, minimums, free-delivery threshold
- [ ] `cart` module: guest cart cookie, merge on sign-in, quantity limits, price/stock change flags
- [ ] Cart UI: drawer, full page, `QuantityStepper`, `SubstitutionSelect`, Weighed Product notes
- [ ] `delivery` module: Zone resolution, Slot listing, 10-minute holds, atomic booking
- [ ] Address book with map pin, landmark, Zone coverage check
- [ ] `inventory` module: availability, atomic reserve/release, movements log
- [ ] `orders` module: `placeOrder` (idempotent), status machine, history events
- [ ] Checkout page: Address, Slot, contact, COD, summary, server re-pricing
- [ ] Order confirmation page and tracking page
- [ ] `notifications`: order confirmed email and SMS
- [ ] Account area: profile, addresses, order history, cancel before picking
- [ ] Jobs table and cron: expire holds and stale reservations
- [ ] Playwright journey: browse, add, checkout as guest then sign in, place COD order, see tracking
- [ ] Concurrency tests: two checkouts competing for the last unit and the last Slot

**Exit criteria:** a Customer places and tracks a COD order on a phone; two simultaneous buyers of the last item result in exactly one Order; the total on the confirmation page equals the total computed by `priceCart` to the centavo; the E2E journey is green in CI.

## Phase 3: Online payments

- [ ] Provider chosen after sandbox evaluation; [ADR 0003](adr/0003-payment-provider-interface.md) updated
- [ ] `PaymentProvider` adapter: create checkout, verify webhook, parse event, capture, refund
- [ ] Hosted checkout redirect and return page that waits for the webhook, never trusting the redirect
- [ ] `payment_events` ledger with unique provider event id; duplicate-webhook tests
- [ ] 15-minute unpaid-order expiry job
- [ ] Weighed-item handling per [03-ARCHITECTURE.md](03-ARCHITECTURE.md) section 8 (decision closed and documented)
- [ ] Refund flow (full, partial) with Customer notification
- [ ] Failure UX: declined card, abandoned wallet, expired session; cart preserved
- [ ] Sandbox end-to-end tests for GCash and card

**Exit criteria:** in sandbox, a paid order moves to confirmed only after a verified webhook; replaying the same webhook ten times changes nothing; a declined payment returns the Customer to Checkout with the Cart intact; a partial refund updates the ledger and the Order.

## Phase 4: Operations

- [ ] Staff roles and permissions (admin, merchandiser, picker, dispatcher); audit log
- [ ] Order queue with filters, search, status changes, notes
- [ ] Picker view (mobile-first): aisle-ordered list, tick, mark short, propose Substitution, enter final weight
- [ ] Customer-side Substitution response (SMS link or app notice) with auto-accept on timeout
- [ ] Final amount recalculation and payment adjustment after picking
- [ ] Dispatch view: assign Rider, out for delivery, proof of delivery (photo or PIN), failed delivery
- [ ] COD collection and per-Rider reconciliation
- [ ] Stock: receipts, adjustments, shrink, low-stock list
- [ ] Zone, fee and Slot management UI
- [ ] Minimal daily report: orders, revenue, fill rate, late deliveries
- [ ] Printable pick sheets and delivery receipts (VAT breakdown)

**Exit criteria:** a Hub dry run with 20 real-looking Orders, one Picker and one Rider completes with no developer help, including three shorts, two Substitutions and one weighed adjustment; every status change appears in the order history.

## Phase 5: Growth (V1)

- [ ] Recipes: admin editor, public pages, servings scaler, "Add all to cart"
- [ ] Reorder from history; saved shopping lists; "Buy again" rail
- [ ] Promotions and Vouchers with eligibility rules and usage caps
- [ ] Referral codes and rewards ledger
- [ ] Freshness Claims with photo upload and resolution workflow
- [ ] Abandoned-cart reminder (email/SMS with consent)
- [ ] PWA: manifest, install prompt, offline-friendly cart and browse shell
- [ ] Filipino translation pass (`next-intl` or equivalent)
- [ ] Back-in-stock notifications
- [ ] Analytics events and funnel dashboard

**Exit criteria:** a Customer cooks from a Recipe in under a minute of cart-building; a Voucher cannot be applied twice or outside its rules; a Claim is filed, resolved and refunded end to end.

## Phase 6: Launch hardening

- [ ] Load test checkout and Slot booking at 5x expected peak
- [ ] Accessibility audit (axe plus manual TalkBack and VoiceOver pass)
- [ ] Security review (`security-review` skill), dependency audit, rate-limit tests, OTP abuse tests
- [ ] Privacy policy, terms, refund policy, Tax and Business Compliance page, cookie consent
- [ ] Backups and a tested restore
- [ ] Monitoring and alerts: checkout error rate, webhook failures, job lag, Slot capacity
- [ ] Runbook: how to handle a stuck payment, a wrong refund, a Hub shutdown, a provider outage
- [ ] Production domain, email DNS (SPF, DKIM, DMARC), SMS sender
- [ ] Soft launch to friends and family in one Zone for two weeks; fix list; then open

**Exit criteria:** all non-functional targets in [01-PRD.md](01-PRD.md) section 7 are measured and met; restore drill completed; owner signs off after the soft launch with fewer than 3 Freshness Claims per 100 Orders.

## Parallel business tracks

| Track | Needed by | Owner |
|---|---|---|
| Supplier agreements and price lists | Phase 1 data load | Owner |
| Product photography plan (200 hero SKUs first) | Phase 1 | Owner |
| Payment provider business verification | Start Phase 0, needed Phase 3 | Owner |
| Business registration, BIR, VAT classification | Phase 4 receipts | Owner and accountant |
| Hub lease, chillers, shelving, tote system | Phase 4 dry run | Owner |
| Rider hiring or partner | Phase 4 | Owner |
| SMS sender ID registration | Phase 2 | Owner |
| Legal review of terms, privacy, refunds | Phase 6 | Owner and lawyer |

## Definition of done (every item)

1. Acceptance criteria written first and met; related requirement IDs from the PRD cited.
2. Tests: unit for logic, integration for database behaviour, E2E for the user journey it enables.
3. States covered: loading, empty, error, and the unhappy path.
4. Accessibility checklist in [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md) section 10 passed.
5. `npm run check` is green; no new lint suppressions without a comment.
6. Docs updated: glossary if a new term appeared, ADR if a hard-to-reverse decision was made, roadmap ticked.
7. Exercised in the running app, not only in tests.
