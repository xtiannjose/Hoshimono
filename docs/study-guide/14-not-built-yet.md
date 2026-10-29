# 14. What is not built yet, and what is blocked

Phases 0 to 5 are built. This chapter lists what is left before launch, what is blocked and on whom, and which parts of the running app are still stand-ins. It follows sections 0, 9, 10 and 11 of the [roadmap](../07-ROADMAP.md) as of 28 October 2026. When the roadmap changes, the roadmap wins.

## 14.1 Blocked right now: GitHub

On 22 October GitHub answered "Your account is suspended" to both its website API and git. Until the account `xtiannjose` is restored (contact https://support.github.com):

- Finished work waits on the developer's computer, one branch per piece, each built on the one before. Roadmap section 0 lists them in order; when access returns, each is pushed and opened as a pull request against `main`, in that order.
- CI cannot run (chapter 12). The CI run on the last merge to `main` (`6477f88`) was still running when access stopped; its result is unknown. A local production build and the full test suites passed on the same code.

## 14.2 Next, in order

From roadmap section 0, as of 28 October:

1. **The Phase 4 dry run with people.** The screens have been through a full simulated day of 20 Orders (`npm run db:dry-run`, `e2e/dry-run.spec.ts`), which found and fixed a few things a Picker or Dispatcher would trip on. The exit criterion still needs people: one Picker and one Rider working 20 Orders with **no developer help**. [`docs/dry-run.md`](../dry-run.md) is their checklist.
2. **A native speaker checks the Filipino** in `src/i18n/fil.ts` and the message words in `src/modules/notifications/internal/words.ts`. The whole shop and its messages are in Filipino now ([ADR 0017](../adr/0017-filipino-pwa-and-funnel.md), [ADR 0019](../adr/0019-filipino-for-the-rest-of-the-shop.md), [ADR 0021](../adr/0021-messages-in-the-customers-language.md)); only sign-in codes, the Substitution answer page and the stop page are still English.
3. **A lawyer reviews the policy pages** (`/privacy`, `/terms`, `/refunds`, `/business-info`), and the owner fills in the business facts in `src/config/legal.ts`.
4. **The PayMongo test-mode run** (Batch 6.3), once the keys exist: GCash and card paid, failed and expired; full and partial refunds; the webhook endpoint registered for `checkout_session.payment.paid` and `payment.refunded`. Until then the PayMongo adapter has never talked to PayMongo; in particular the address it uses to expire a checkout is taken from PayMongo's documents and marked unconfirmed in the code (`src/modules/payments/internal/paymongo.ts`).
5. **What is left of Phase 6** (section 14.3), most of it waiting for accounts.
6. **Feature ideas** from other grocery shops, when the owner picks them (section 14.8).

## 14.3 Phase 6: what is done and what is left

**Done (28 Oct 2026):**

- Load test on a laptop: 200 checkouts at 5 times an assumed peak, and races for the last Slot places and last units, with nothing overbooked or oversold ([`docs/load-test.md`](../load-test.md)).
- Backups: a restore drill script and a first drill, every table's rows matching ([`docs/backup-restore.md`](../backup-restore.md)).
- An alerting health check, `/api/health?deep=1`, for an uptime monitor ([runbook](../runbook.md)).
- The security review and its fixes, abuse tests included ([`docs/security-review.md`](../security-review.md), chapter 11.8).
- An automated accessibility sweep of every page a guest, a Customer and an Admin can open, light and dark (`e2e/a11y-sweep.spec.ts`).
- Draft policy pages, the runbook, and this study guide.

**Left:**

- The same load test on a Vercel preview with Neon, from outside.
- Sentry for errors, and an uptime monitor on `/api/health` and `/api/health?deep=1`.
- A restore drill on Neon itself.
- A manual accessibility pass with TalkBack (Android) and VoiceOver (iPhone).
- The lawyer's review of the policies. (A Customer can now download their data or delete their account themselves, [ADR 0020](../adr/0020-customer-data-export-and-deletion.md).)
- The PayMongo test-mode run.
- The production domain, email DNS records (SPF, DKIM, DMARC, which let mail services trust our emails) and the SMS sender.

**Soft launch and public launch**

- Two weeks with friends and family in one Zone, with a daily fix list; then all Zones.
- Exit criteria: every non-functional target in PRD section 7 measured and met; a restore drill done; the owner signs off after the soft launch with fewer than 3 Freshness Claims per 100 Orders.

## 14.4 Still open from earlier phases

From roadmap section 9:

| Item                                                                                                           | Why it is open                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A missing Product or Category answers with status 200 (a "not found" page, marked not to index) instead of 404 | Next.js 16 cannot call `notFound()` in the page shell for pages made on demand; recheck on each Next upgrade                                                                |
| Uploaded photos show only in development                                                                       | Photos are saved to the server's disk (`public/media`), which a production server does not serve after start and Vercel does not allow. Waits for the Cloudflare R2 account |
| Lighthouse on the CI runner after Phase 5                                                                      | Waits for GitHub; laptop runs swing from 66 to 82 on the same build                                                                                                         |
| JavaScript over budget on Home (182 KB) and Product (181 KB), against 170 KB                                   | Both language dictionaries ship to every page; the Product page's list and alert buttons bring a class-merging library                                                      |
| A rare development-only test flake ("Unexpected end of JSON input")                                            | Seen only on `next dev` with the whole suite; CI tests a production build                                                                                                   |
| Two workarounds kept on purpose: `CartSync` and `formKey`                                                      | Judged simpler than the alternatives; revisit if they cause trouble                                                                                                         |
| Phase 0: a Vercel project with preview deployments, and Sentry                                                 | Accounts not created yet                                                                                                                                                    |

## 14.5 Waiting on the owner

From roadmap section 0:

- **GitHub**: contact support to restore the account.
- **PayMongo**: a test account, with `PAYMONGO_SECRET_KEY` and the webhook endpoint's `PAYMONGO_WEBHOOK_SECRET`. Start business verification now: it takes weeks and blocks live payments. ("Hold then Capture" is not needed: [ADR 0008](../adr/0008-weighed-items-online-and-refunds.md) charges the estimate.)
- **Delete two stale branches**, `phase-1/close-out` and `phase-2/pricing-core` (the AI assistant may not delete branches).
- **The accountant's answers** in [ADR 0007](../adr/0007-pricing-rules-ahead-and-tax-to-confirm.md): VAT registration, the Tax Class per Category, the Senior Citizen and PWD discount; and the owner's real Zone fees.
- **The business tracks** below.
- **Developer machine**: install `@playwright/cli` and `ui-ux-pro-max-cli` globally.

## 14.6 Business tracks

These run beside the code and can block it. On 17 October the owner decided to start them after most of the app was built, so the dates in the roadmap's timeline moved with them. Until each is done, the app is built against seed data, sandboxes and console messages, and the dependent items stay blocked.

| Track                                             | Blocks                                                        |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Payment provider business verification (PayMongo) | Live online payments; can take weeks                          |
| Supplier agreements and price lists               | Real prices (seed prices are invented and must not go public) |
| Product photography (200 hero Products first)     | Real photos (cards show a quiet placeholder today)            |
| SMS sender ID registration                        | Real sign-in codes and Order texts                            |
| Business registration, BIR, VAT classification    | Official receipts, the right Tax Classes                      |
| Hub lease, chillers, shelving, totes              | The Phase 4 dry run                                           |
| Rider hiring or a partner                         | The Phase 4 dry run                                           |
| Legal review of terms, privacy, refunds           | Phase 6 and launch                                            |

The roadmap's rule: if a track slips past its "needed by" week, the dependent phase slips with it. Do not launch payments, receipts or the dry run on placeholders.

## 14.7 Stand-ins in the running app

Parts of the app work, but on a stand-in that must be replaced or confirmed before launch. Each is marked in the code with a `shortcut:` or `ponytail:` comment.

| Stand-in                                                        | What is real later                                   | Where                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Email and SMS printed to the server log                         | Resend for email, Semaphore or Twilio for SMS        | `src/modules/notifications/internal/providers.ts`                                   |
| Stand-in payment provider (`PAYMENT_PROVIDER=fake`)             | PayMongo with real keys                              | `src/modules/payments/internal/fake.ts`                                             |
| Photos on local disk                                            | Cloudflare R2 behind the same `MediaStore` interface | `src/lib/media.ts`                                                                  |
| Zones matched by city and barangay names; no map pin            | A maps provider for the Address pin and Zone check   | `src/modules/delivery/internal/zones.ts`, `src/components/address/address-form.tsx` |
| One Hub                                                         | Per-Hub stock and Slots are already modelled         | `src/modules/delivery/internal/hubs.ts`                                             |
| Search Synonyms as a fixed list in code                         | A table Merchandisers can edit                       | `src/modules/catalog/internal/search/synonyms.ts`                                   |
| "Related Products" from the same Category                       | "Often bought together" once there is purchase data  | `src/modules/catalog/internal/related.ts`                                           |
| Slot Cutoff 90 minutes; COD limits of 3 open Orders and ₱20,000 | Values operations set                                | `slots.ts`, `place-order.ts`                                                        |
| Seed prices and Zone fees                                       | Supplier price lists; the owner's fees               | `prisma/seed-data.ts`                                                               |
| Pick List in Category order                                     | Aisle codes when the Hub has them                    | `src/modules/orders/internal/picking.ts`                                            |
| "Not an official receipt"                                       | BIR-compliant receipts after registration            | `src/app/admin/print/receipt/`                                                      |
| The Customer's Order page does not refresh by itself            | Polling or live updates, if wanted                   | `src/app/[lang]/orders/[orderNo]/page.tsx`                                          |

Also in the code but unused: the payment status `authorised`, the Order column `authorised_cents` and the provider function `capture`, all from the card-hold plan that [ADR 0008](../adr/0008-weighed-items-online-and-refunds.md) replaced.

## 14.8 Left out on purpose

Each ADR lists what it chose not to build "now". In one place:

- **Recipes and Articles**: Recipes in search, ratings and comments, nutrition, video, rich text, scheduled publishing, more than one photo.
- **Retention**: SMS Cart Reminders, more than one reminder, offers in reminders, shared Shopping Lists, price-drop alerts.
- **Offers**: buy-X-get-Y, store credit beyond claims, Vouchers for guests, two Vouchers on one Order, a cap on Referral rewards per Customer.
- **Claims**: claims after 24 hours, automatic approval, returning items, claims on substitutes separately from their line.
- **Filipino and the app**: Filipino for the remaining pages and all messages, push notifications, offline Cart changes, Vercel Analytics, per-visitor journeys.
- **Dispatch**: photo proof of delivery, partner delivery apps.
- **Design**: a new logo, real photos.
- **Not in V1 at all** (PRD): a marketplace of other sellers, a native app (a Flutter plan is frozen in `docs/concepts/flutter-mobile`), alcohol or prescription items, subscriptions, multiple currencies.

**Feature ideas** collected on 22 October from other grocers (roadmap section 10), none decided or scheduled; a picked idea becomes a batch with its own ADR:

- First picks: QR Ph, InstaPay and Maya payments; changing an Order before Picking; pickup at the Hub; a delivery membership; a report of searches that found nothing.
- Strong for the Philippine market: multi-buy and bundles ("Buy 1 Take 1", sinigang sets), loyalty points, payday and seasonal campaigns, repeat Orders from a Shopping List, the Senior Citizen and PWD discount.
- Delivery and trust: live Order progress, the Rider's arrival time and photo proof, Viber or Messenger messages, fuller Product pages.
- Later: buy now pay later, pasting a shopping list, barcode scanning for Pickers, grouping deliveries into Rider routes.

## 14.9 Keeping this guide true

This guide describes commit `c79a361`. When a batch lands, the chapters it touches should be updated in the same pull request, the same way the roadmap and the glossary are. The quickest check is to open each chapter's "Where to look in the code" table and confirm the files and function names still exist.

## Check yourself

<details>
<summary>What must happen before Phase 4 can be called done?</summary>

The dry run: 20 real-looking Orders handled by one Picker and one Rider with no developer help, including three shorts, two Substitutions and one weighed adjustment, with every status change in the Order history. It needs the Hub and a Rider (business tracks).
</details>

<details>
<summary>Why can the shop not take real GCash payments today, even though the code is written?</summary>

There is no PayMongo account, so no keys, and the adapter has never been run against PayMongo's test mode. Live payments also need PayMongo's business verification, which takes weeks.
</details>

<details>
<summary>A photo uploaded in the admin shows in development but not on a production build. Is that a bug?</summary>

It is a known stand-in: photos are saved to the server's disk until the Cloudflare R2 store exists, and a production server does not serve files added after it started.
</details>
