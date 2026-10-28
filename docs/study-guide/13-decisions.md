# 13. Decisions: the 18 ADRs

An **ADR** (architecture decision record) is a short note written when a choice is hard to reverse: what was decided, what else was considered, and what it costs. They live in [docs/adr/](../adr/). The rule ([CLAUDE.md](../../CLAUDE.md)): check the ADRs before reopening a decision, and contradicting one needs a new ADR. This chapter gives one paragraph per ADR: what was decided, why, and what it costs, with where it shows in the code.

The ADRs fall into four groups:

| Group                      | ADRs                               |
| -------------------------- | ---------------------------------- |
| Foundations                | 0001, 0002, 0004, 0005, 0006, 0009 |
| Money and payments         | 0003, 0007, 0008                   |
| Hub operations             | 0010, 0011, 0012                   |
| Growth and the shop's face | 0013, 0014, 0015, 0016, 0017, 0018 |

## Foundations

### [0001](../adr/0001-modular-monolith-nextjs.md): One Next.js app, organised as a modular monolith

**Decided:** the storefront, the staff screens, the API, webhooks and cron live in one Next.js app, one deployment, one database. Business logic sits in `src/modules/*` behind public `index.ts` files. **Why:** a team of one to three developers moves fastest with one repo, one deploy and one database. A separate backend would double the deployment, sign-in and typing work for no current benefit; microservices solve scaling and team problems Hoshimono does not have; a headless commerce platform (Medusa, Saleor, Shopify) would be bent more than used, because Hub stock, Slot capacity, weighed items, Philippine payments and the Picker workflow are the core. **Cost:** module walls are only a convention, so they must be enforced (the ESLint rule and its test, chapter 3), or the code decays into a "big ball of mud". Long or bursty work must go through the jobs table and cron, because the host runs short requests (chapter 10).

### [0002](../adr/0002-money-as-integer-centavos.md): Money is integer centavos

**Decided:** every amount is a whole number of centavos in the database, the code and API payloads. One rounding rule (round half up, per line, then sum) in `src/lib/money.ts`; formatting only at the edge. **Why:** decimal fractions in floating point are approximate, and the errors show up as one-centavo disagreements between the Cart, the Order, PayMongo and the receipt. A decimal library was rejected because it invites mixing types at boundaries. **Cost:** every developer must remember that `5900` means ₱59.00, and every percentage must go through `prorate`. In exchange, the wrong thing is hard to do: `addMoney` throws on any fraction (chapter 5).

### [0004](../adr/0004-postgres-prisma.md): PostgreSQL is the only datastore, used through Prisma

**Decided:** one Postgres database for everything, including search, with Prisma for typed queries and migrations. **Why:** stock reservation, Slot capacity and payment idempotency need real transactions and constraints, and Postgres's full-text and trigram search are enough for the launch range. Prisma was chosen over Drizzle for its migration tooling; MongoDB and SQLite were rejected for weaker concurrency guarantees. **Cost:** the guarded updates (reserve stock, book a Slot) must be hand-written SQL, because an ORM's read-then-write is not safe under concurrency; constraints Prisma cannot express are hand-edited into migrations. Search may outgrow Postgres around 10,000 Products, which is why it sits behind the `SearchIndex` interface (chapter 3).

### [0005](../adr/0005-neon-postgres-host.md): Neon hosts the database

**Decided:** Neon, in Singapore, for production, development, tests and one database branch per preview deployment. **Why:** it is plain Postgres (so nothing in the code is Neon-specific), and its Vercel integration gives every pull request its own database branch. Supabase was rejected because its extras (auth, storage) duplicate what Hoshimono already chose. **Cost:** two connection strings per environment (pooled for the app, direct for migrations), and development branches that sleep and wake slowly; production compute settings must be checked before launch so a cold start never hits a Customer at Checkout. **Status:** the Neon account does not exist yet; development uses a Docker Postgres (chapter 2).

### [0006](../adr/0006-postgres-rate-limit-store.md): Rate limits are counted in Postgres

**Decided:** fixed-window counters in a `rate_limits` table, one atomic `INSERT ... ON CONFLICT DO UPDATE` per request (`src/lib/rate-limit.ts`). Better Auth's sending endpoints are closed over HTTP, so sign-in only starts from our rate-limited Server Actions. **Why:** Redis would need another account and secret while accounts are deferred; Better Auth's own limiter does not see Server Action calls; in-memory counters reset on every serverless cold start and are not shared. **Cost:** one small database write per protected request (search suggestions are the busiest, 120 a minute per IP). Moving to Redis later means rewriting only `takeToken` (chapter 11).

### [0009](../adr/0009-module-results-and-errors.md): How a module says no

**Decided:** reads return `null`; business refusals return `{ ok: false, reason }`; form checks return `{ ok: false, errors: { field: message } }`; simple yes-or-no commands may return a boolean, several non-failure outcomes a word, amounts a number; bugs and outages throw and are caught only at the edge. **Why:** by Phase 3 the modules said "no" six different ways, and a database outage had shown up as "wrong sign-in code". The owner chose to write down the rule the code mostly followed and fix the outliers, not rewrite every module. **Cost:** callers must know which shape a function returns, and every new function needs a deliberate choice. Benefit: an outage can never masquerade as a business answer (chapter 3).

## Money and payments

### [0003](../adr/0003-payment-provider-interface.md): A provider-agnostic payment interface; PayMongo is the provider

**Decided:** business code talks only to a `PaymentProvider` interface (create and expire a checkout, refund, verify and parse webhooks). On 19 October 2026 the owner chose **PayMongo** over Xendit. **Why:** lower fees (GCash 2.23% against 2.58%; cards 3.125% + ₱13.39 against 3.58% + ₱11.20, roughly ₱3,500 to ₱4,500 less per ₱1M a month), webhooks signed with HMAC-SHA256 over the raw body (Xendit sends a static token, which would force re-fetching every payment), and partial refunds on GCash, Maya and cards, which weighed items and shorts need. **Cost:** cash on delivery stays a first-class method with no provider; a PayMongo Checkout Session does not expire by itself, so the 15-minute job must expire it (`expireCheckout`); switching provider later means one new adapter, not new Order or Checkout code. **Status:** the adapter is written and tested against a fake web layer only; the PayMongo test-mode run waits for keys (chapter 14). Its open question about card holds was settled by ADR 0008.

### [0007](../adr/0007-pricing-rules-ahead-and-tax-to-confirm.md): Pricing rules decided ahead, and tax answers still owed

**Decided** (by the owner on 19 October, ahead of the phases that needed them): an Order-level discount is spread over lines in proportion before VAT, the leftover centavo to the largest line, and never reduces the Delivery Fee; a free-delivery Voucher zeroes the fee and is not a discount; the Order Minimum and Free-Delivery Threshold are judged once, at Checkout, on estimated weights, and a lighter pick never adds a fee; the Senior Citizen and PWD discount is not built unless the accountant says it is required at launch. **Why:** so these rules would not be re-argued in Phases 4 and 5, and because charging a fee the Customer was told they would not pay breaks trust for small amounts. **Cost:** Hoshimono absorbs the fee when a pick drops below a threshold. **Still owed:** four answers (VAT registration; the Tax Class per Category, where frozen shrimp, dried fish, salt and raw sugar may be wrongly vatable in the seed; the real Zone fees; the Senior Citizen and PWD discount). Seed prices pair real brands with invented amounts and must not appear on a public preview (chapter 14).

### [0008](../adr/0008-weighed-items-online-and-refunds.md): Weighed items paid online, and how refunds work

**Decided** (owner, 20 October): every online method charges the estimate through the hosted checkout, cards included, with no card holds; the Final Total follows what was packed and never goes above the estimate (a heavier pack is on Hoshimono, for every method); paid online, the difference is refunded in one go at `picked`; cancelled paid Orders and late money are refunded in full automatically; every centavo is refunded; a refund is recorded before it is sent and sent at most once, and an unclear outcome goes to a person, never resent. **Why:** PayMongo card holds must be captured within 7 days (Slots can be 7 days ahead), need card fields on our page, work only for Visa and Mastercard, and need PayMongo's approval. **Cost:** Hoshimono pays PayMongo's fee on every refunded centavo and absorbs heavier picks; Customers may see a second line (the refund) on their statement; refunds marked for review need the staff screen and a runbook. Note: [CLAUDE.md](../../CLAUDE.md) and the PRD still describe card holds of estimate plus 10%; the code follows this ADR (chapter 7).

## Hub operations

### [0010](../adr/0010-picking-and-substitutions.md): Picking and Substitutions

**Decided** (owner, 21 October): the Customer pays the lower of the substitute's and the ordered Product's price; "pick a similar item" lets the Picker choose and gives the Customer a 10-minute Substitution Window to refuse, with silence a yes; "I'll choose" takes only the Customer's named Product, accepted at once; "no substitute" means short; weighed lines are never substituted; one Substitution per line covering the missing pieces; the Pick List follows the Category tree until the Hub has aisle codes; Picking finishes only when every Substitution is answered or its window has ended. **Why:** the PRD promised per-line control and no overcharging but not how. **Cost:** a Picker may wait up to 10 minutes before finishing an Order (they pick others meanwhile); the answer link must work without sign-in, so it carries an unguessable single-purpose token. Its note that substitutes are not yet deducted from stock was superseded by ADR 0012 (chapter 8).

### [0011](../adr/0011-dispatch-pin-and-cash.md): Dispatch, the Delivery PIN and cash on delivery

**Decided** (owner, 21 October): Riders use the app with a new `rider` role and see only their Orders; Staff gain a mobile number, shown to the Customer once their Order leaves; only the Dispatcher's board sends Orders out; proof of delivery is a 4-digit Delivery PIN sent to the Customer, entered by the Rider, locked after 5 wrong tries, with the Dispatcher able to mark delivered with a reason; a failed delivery records why and sends "we missed you"; cash is recorded per Order at the door (a different amount needs a note) and counted per Rider at day's end (a shortfall needs a note). **Why:** the plan had no Rider records and Rider hiring is still a business track. **Cost:** a 4-digit PIN proves only that someone at the address had the Customer's message; photo proof waits for image storage; partner apps such as Lalamove or Grab are not supported (chapter 8).

### [0012](../adr/0012-stock-slots-reports-receipts.md): Stock at picking, the Slot schedule, the daily report and receipts

**Decided** (defaults Claude chose on 21 October when the owner asked to finish the batch; the owner may revise them): stock leaves the shelf count at `picked`, and an Order cancelled after picking puts it back (`return`); Admins and Dispatchers keep stock (receipts, Shrink with a reason, counts never below what is reserved, a low-stock list); Slots come from a weekly schedule generated 7 days ahead by the cron, seeded as every day 8 AM to 8 PM in 2-hour windows of 20; Zone fees are Admin-only; a daily report for Admins and Dispatchers; printouts are web pages, and the Delivery Receipt says it is not an official receipt until BIR registration. **Why:** to close Phase 4 with sensible operating defaults. **Cost:** substitutes were never reserved, so taking one may meet a shelf count that is already off; editing the schedule changes only days not yet generated; official receipts and invoice numbering wait for the accountant (chapter 8).

## Growth and the shop's face

### [0013](../adr/0013-recipes-articles-and-content-editors.md): Recipes, Articles and Content Editors

**Decided** (owner, 21 October, with some defaults): a new Content Editor role writes Recipes and Articles without code; a Recipe has one photo, base servings, times, ingredients and one box per step; an ingredient is a Product to buy (with a count and whether it scales) or plain text, and may be "usually at home"; one button adds the ticked ingredients on top of the Cart, capped by stock, with a similar Product offered for a sold-out one; the server recomputes every count; Articles have sections and linked Products. **Why:** Recipe to Cart is one of the six things meant to set Hoshimono apart (PRD section 6). **Cost:** four new tables and a role; Recipe text does not scale with servings (only the counts do); no Recipe search, ratings, nutrition, video, rich text or scheduled publishing yet (chapter 9).

### [0014](../adr/0014-reorder-lists-reminders-stock-alerts.md): Reorder, Shopping Lists, Cart Reminders and Stock Alerts

**Decided** (owner, 21 October, with some defaults): Reorder adds a past Order's Products to the current Cart at today's prices through the same `cart.addLines` as Recipes; "Buy again" shows up to 12 Products from delivered Orders; up to 20 named Shopping Lists of up to 100 Products; one Cart Reminder email 3 hours after the last change, only with the Customer's consent (off by default) and with a signed stop link that needs a button press; Stock Alerts by email and SMS, ending after 30 days; both run from the cron through the outbox, marked in the same transaction that queues the message. **Why:** the V1 retention items, under the Data Privacy Act's consent rule. **Cost:** three tables and two columns; the stop link depends on the app secret; no SMS reminders, no second reminder, no shared lists (chapter 9).

### [0015](../adr/0015-promotions-vouchers-referrals.md): Promotions, Vouchers and Referrals

**Decided** (owner, 21 October, with some defaults): a Promotion (percent or pesos off each unit, for Products and Categories, between dates) is the shelf price everywhere, the lower price winning; a Voucher (percent with a cap, pesos off, or free delivery; minimum spend, total and per-Customer limits, first Orders only, or one Customer only) is one per Order on top of Promotions, re-checked on every pricing and recorded under a lock at Checkout; Referrals give each side a ₱100 Voucher (minimum ₱500, 60 days) when the invited friend's first Order is delivered. **Why:** savings and word of mouth, run by Merchandisers without code. **Cost:** five new tables and columns; `catalog` now asks `pricing` for prices; no buy-X-get-Y, store credit outside claims, guest Vouchers, stacking, or a cap on referrals per Customer (watch for abuse) (chapters 5 and 9).

### [0016](../adr/0016-freshness-claims.md): Freshness Claims

**Decided** (owner, 22 October, with some defaults): a Customer files a claim on a delivered Order Line within 24 hours (spoiled, damaged, missing or wrong item; how many; a note; 1 to 3 photos, required for spoiled or damaged); the server works out the value; Admins and Dispatchers approve in full or less, or reject with a reason; online Orders are refunded through the refund ledger, cash Orders (or anything that cannot be refunded) get a store-credit Voucher for 90 days; the Customer is told; the daily report counts claims per 100 delivered Orders. **Why:** PRD ACC-6, and the launch exit criterion of fewer than 3 claims per 100 Orders. **Cost:** a new module and table; refunds now allow one per claim (a partial unique index instead of one per reason); no claims after 24 hours, no automatic approval, no returns (chapter 9).

### [0017](../adr/0017-filipino-pwa-and-funnel.md): Filipino, the installable app and the shopping Funnel

**Decided** (owner, 22 October, with some defaults): Filipino pages at `/fil/...` with English keeping its addresses, every shop page under `src/app/[lang]` so each language is prerendered on its own; two dictionaries checked by TypeScript instead of a translation library; the shell and main shopping pages translated first, the rest later; an installable app with a small hand-written service worker that never stores personal or money pages; a Funnel of four daily counts with no identifier, cookie or third party, so no consent banner. **Why:** the PRD's Filipino, PWA and analytics items, under principle 6 "light on data". **Cost:** public routes moved under `[lang]`; Server Actions cannot read the language, so they return reason codes and pages choose the words; the Address form and all messages stay English for now; the Filipino is a draft that a native speaker must check before launch; no push notifications or offline Cart changes (chapter 9).

### [0018](../adr/0018-design-pass.md): The design pass

**Decided** (owner, 22 October, with some defaults): Home opens on the shop (a delivery strip, one row of Categories, then Products) instead of a stock "hero"; Product photo spaces keep their square but show a quiet tint with one icon per top-level Category until real photos arrive; staff screens get their own frame with a sidebar grouped by job; the logo stays for now; one button system and one 44-pixel field style, with no class-merging library in the browser; copy reads like people talk, with one wording for weighed items. **Why:** the 18 October review listed what made the app read as machine-made. **Cost:** the design system document changed and the v2 mockup is now history; the admin layout no longer uses the shop's frame; a new logo, real photos and the legal pages are still to come.

## Decisions still open

The ADRs record several answers that are not the developer's to give:

| Question                                                        | Owner of the answer | ADR                |
| --------------------------------------------------------------- | ------------------- | ------------------ |
| Is the business VAT-registered at launch?                       | Accountant          | 0007               |
| The Tax Class of each Category                                  | Accountant          | 0007               |
| Real Delivery Fees, Free-Delivery Thresholds and Order Minimums | Owner               | 0007               |
| Senior Citizen and PWD discount for online sales                | Accountant          | 0007               |
| Payout timing, verification time and refund fees at PayMongo    | Test-mode trial     | 0003               |
| The defaults Claude chose in ADRs 0012 to 0018                  | Owner (may revise)  | each ADR           |
| Feature ideas from other grocery shops                          | Owner (to pick)     | roadmap section 10 |

## Check yourself

<details>
<summary>Why does Hoshimono refund the difference for weighed items instead of holding the card and charging the exact amount later?</summary>

ADR 0008: PayMongo card holds lapse after 7 days (Slots can be 7 days ahead), need card fields on our own page, work only for Visa and Mastercard, and need PayMongo's approval. Charging the estimate and refunding works for every method through the hosted checkout.
</details>

<details>
<summary>Why are rate limits counted in Postgres and not in the server's memory?</summary>

ADR 0006: on a serverless host, memory resets on every cold start and is not shared between copies of the app, so in-memory counters limit nothing. Postgres is already there and counts every request atomically.
</details>

<details>
<summary>Which ADR would a "buy one, take one" offer need?</summary>

A new one. ADR 0015 lists buy-X-get-Y as "not now", so building it changes that decision and needs its own ADR (the roadmap's feature ideas say each picked idea gets its own batch and ADR).
</details>
