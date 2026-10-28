# 12. Testing and quality

A shop that handles money and stock cannot be checked by clicking around after every change. This chapter explains the automated checks that run on Hoshimono's code: what each kind of test proves, where it lives, when it runs, and what it cannot prove.

## 12.1 The layers of checking

From fastest to slowest:

| Layer            | Tool                   | What it catches                                                      | Runs                       |
| ---------------- | ---------------------- | -------------------------------------------------------------------- | -------------------------- |
| Formatting       | Prettier               | Inconsistent layout (spaces, quotes, line breaks)                    | Before every commit        |
| Lint             | ESLint                 | Common mistakes, the module boundary, `next/link` in shop code       | Before every commit, in CI |
| Types            | TypeScript (`tsc`)     | Mixed-up values, missing fields, a Filipino dictionary missing a key | Before every commit, in CI |
| Unit tests       | Vitest                 | Logic in one function: rounding, VAT, parsing, signatures            | Before every commit, in CI |
| Database tests   | Vitest + real Postgres | Rules that depend on the database: races, constraints, transactions  | Before every commit, in CI |
| End-to-end tests | Playwright             | A whole journey in a real browser, accessibility with axe            | In CI; locally on demand   |
| Performance      | Lighthouse CI          | Slow pages on a simulated mid-range phone                            | In CI                      |

**CI** (continuous integration) means these checks run automatically on a clean computer for every pull request, so nothing reaches `main` that fails them.

## 12.2 Lint and types

**ESLint** (`eslint.config.mjs`) reads the code for mistakes without running it. On top of Next.js's recommended rules it adds two of Hoshimono's own:

- **The module boundary** (`moduleBoundary`): no import into another module's `internal/` (chapter 3).
- **Language-keeping links**: shop code may not import `next/link`; it must use `@/components/link`, which keeps the Customer on Filipino pages (chapter 9).

**TypeScript** (`npm run typecheck`, which runs `next typegen && tsc --noEmit`) checks every type in the app without building it. `next typegen` first writes types for every route, so a link to `/orders/[orderNo]` with the wrong parameters fails to compile. The two dictionaries are checked to have the same keys, so a missing Filipino sentence is a type error, not a blank on the page.

## 12.3 Vitest: unit tests and database tests

**Vitest** is the test runner for everything below the browser. There are about 360 test cases in 34 files. Configuration: `vitest.config.mts`.

### Unit tests, next to the code

A **unit test** checks one function on its own. They sit beside the file they test (`src/**/*.test.ts`):

| File                                                    | What it pins                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/money.test.ts`                                 | Formatting, parsing, adding, and the one rounding rule (`prorate`)  |
| `src/modules/pricing/price-cart.test.ts`                | `priceCart`: rounding, VAT per line, Vouchers, thresholds, minimums |
| `src/modules/pricing/price-final.test.ts`               | The Final Total: weighed lines, shorts, substitutes, discount caps  |
| `src/modules/pricing/discounts.test.ts`                 | Spreading a discount, the leftover centavo                          |
| `src/modules/payments/paymongo.test.ts`                 | PayMongo requests and signature checks against a fake web layer     |
| `src/modules/payments/fake.test.ts`                     | The stand-in provider                                               |
| `src/lib/test-mode.test.ts`                             | The guards that keep test tools off a real domain                   |
| `src/proxy.test.ts`, `src/i18n/lang.test.ts`            | Language addresses                                                  |
| `src/lib/dates.test.ts`, `phone.test.ts`, `csv.test.ts` | Manila dates, phone numbers, CSV import                             |

### Database tests, against a real Postgres

Most of the app's important rules depend on the database: a guarded update, a unique constraint, a lock. A fake database would not behave the same under a race, so **anything touching Prisma is tested against a real Postgres, never a mock** ([CLAUDE.md](../../CLAUDE.md)).

- They live in `tests/db/*.test.ts`, one file per area: `orders`, `payments`, `cart`, `delivery`, `inventory`, `invariants`, `claims`, `promotions`, `retention`, `identity`, `rate-limit`, and more.
- They run against the `hoshimono_test` database (from `.env.test`). Before the run, `tests/db/global-setup.ts` applies every migration. Between tests, tables are emptied (`resetDb` in `tests/db/helpers.ts`).
- **They refuse to run against any database whose name does not end in `_test`**, because they wipe tables.
- Files run one at a time (`fileParallelism: false`), because they share one database.

Some test names read like the business rules they protect:

- "two buyers at once: sell the last unit once", and "take the last Slot place once" (`tests/db/orders.test.ts`). They start two `placeOrder` calls at the same moment for the last carton or the last Slot place and check exactly one Order exists and the stock and Slot counts are right.
- "places one Order for a double-click, and answers both clicks with it".
- "applies an event once however many times it arrives" and "never sends again when it cannot tell whether a refund went through" (`tests/db/payments.test.ts`).
- "gives the last place to exactly one of many carts at once" (`tests/db/delivery.test.ts`).
- "takes silence as a yes once the window ends" (Substitutions).
- "locks the PIN after 5 wrong tries; the Dispatcher can deliver with a reason".

`tests/db/invariants.test.ts` checks that the database itself refuses what must never happen, with the app out of the way: reserved stock above on hand, a Slot booked past capacity, the same provider event twice, two Orders with one idempotency key, a total that does not add up, two primary photos, two open Carts for one Customer (the invariants in [04-DATA-MODEL.md](../04-DATA-MODEL.md) section 4).

### Test first

Pricing, the Cart, stock reservation, Order status moves and webhook handlers are built **test-first** ([CLAUDE.md](../../CLAUDE.md), the `tdd` skill): write a test that describes the rule and fails, write the code that makes it pass, then tidy. This "red, green, refactor" loop means every money and stock rule was a test before it was code.

## 12.4 Playwright: end-to-end tests

An **end-to-end (e2e) test** drives a real browser through a whole journey, as a Customer or a Staff member would. **Playwright** runs them. They live in `e2e/`, 21 spec files, such as:

| Spec                                                     | Journey                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `checkout.spec.ts`                                       | Browse, add, check out as a guest then sign in, place a cash Order, see tracking, on a phone-sized screen |
| `online-payment.spec.ts`                                 | Pay through the stand-in provider, the pay page, Back to cart, a refund after cancelling                  |
| `picking.spec.ts`                                        | The Picker's screens and Substitutions                                                                    |
| `dispatch.spec.ts`                                       | Sending out with a Rider, the PIN, failed deliveries, cash                                                |
| `recipes.spec.ts`, `offers.spec.ts`, `retention.spec.ts` | Recipes to Cart, Vouchers, lists and reminders                                                            |
| `filipino.spec.ts`, `app.spec.ts`                        | Filipino pages; the installable app and offline page                                                      |
| `a11y.spec.ts`                                           | Home in light and dark with no accessibility violations                                                   |

**Accessibility.** Fifteen of the specs also run **axe** (`@axe-core/playwright`), a tool that checks a page against accessibility rules: labels, contrast, headings, focus. The target is WCAG 2.2 AA (PRD section 7, [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) section 10).

**How they run** (`playwright.config.ts`):

- Playwright starts its own server on port 3100 against the `hoshimono_e2e` database, which it migrates, empties and re-seeds every run (`e2e/reset-db.mts`). Every run starts from the same data.
- The server runs with `PAYMENT_PROVIDER=fake` (the stand-in pays), `E2E_MAILBOX=1` (tests read sign-in links and messages from `/api/dev/mailbox` instead of an inbox), and a known `CRON_SECRET` so tests can run the cron tick.
- In CI it tests a **production build** (`E2E_PROD=1`), the code Customers would really run. Locally it uses the faster development server.
- The service worker is blocked except in `app.spec.ts`, because Playwright cannot follow requests it passes through.

At the general checkup on 22 October, all 71 e2e tests passed on a production build.

## 12.5 CI: the checks on every pull request

`.github/workflows/ci.yml` runs three jobs on GitHub's computers for every pull request and every push to `main`, each with its own fresh Postgres 17:

1. **`check`**: install, lint, type check, all Vitest tests, then a production build.
2. **`e2e`**: install a browser, then the whole Playwright suite against a production build. On failure, the screenshots and traces are kept for 7 days.
3. **`lighthouse`**: seed a database, build, start the app, and run **Lighthouse** three times on Home, a Category page and a Product page on a simulated mid-range phone. The median performance score must be at least 90, and accessibility, best practices and SEO must each be 100, or the pull request fails (`lighthouserc.json`).

**Why Lighthouse runs in CI, not on a laptop:** local scores swing by about 10 points on the same code, depending on what else the laptop is doing. The clean CI computer is the measurement to trust (roadmap section 0).

**Right now CI is not running.** The GitHub account was suspended on 22 October, so the last four branches have not been pushed and the CI result of the last merge to `main` is unknown. A local production build and the full test suites passed on the same code (chapter 14).

## 12.6 Before every commit

`.husky/pre-commit` runs on the developer's machine every time a commit is made:

1. `lint-staged`: Prettier formats the files being committed.
2. `npm run lint`.
3. `npm run typecheck`.
4. `npm run test`: the whole Vitest suite, including the database tests (Docker must be running).

A commit that breaks any of these is refused. Commits use Conventional Commits messages (`feat(claims): ...`, `fix(checkout): ...`) and are made only when the owner asks ([CLAUDE.md](../../CLAUDE.md)).

Separately, the AI assistant's own shell commands pass through a guard (`.claude/hooks/block-dangerous-git.mjs`) that blocks destructive git commands such as `git reset --hard`, allows pushing only a feature branch to `origin`, and leaves merging pull requests to the owner.

## 12.7 Performance budgets

From [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) section 11 and PRD section 7:

| Budget                                          | Target                                     |
| ----------------------------------------------- | ------------------------------------------ |
| Largest Contentful Paint (main content visible) | Under 2.5 s on a mid-range Android over 4G |
| Interaction to Next Paint (response to a tap)   | Under 200 ms                               |
| Layout shift                                    | Under 0.1                                  |
| JavaScript on a Category page                   | Under 170 KB compressed                    |
| A Product card's photo                          | Under 40 KB                                |
| Web fonts                                       | Under 120 KB in total                      |

After Phase 5 the checkup measured Home at 182 KB and Product at 181 KB of JavaScript, still over: both language dictionaries ship to every page, and the Product page's buttons bring a class-merging library. These are open items (chapter 14).

## 12.8 "Done" means seen working

A batch is not done because its tests pass. The roadmap's definition of done ([07-ROADMAP.md](../07-ROADMAP.md) section 12) also requires acceptance criteria written first, loading, empty, error and unhappy states covered, the accessibility checklist passed, `npm run check` green, the glossary and ADRs updated, and the feature **exercised in the running app**. A phase is done only when its exit criteria are observably met, which is why Phase 4 still waits on a dry run with a real Picker and Rider (chapter 14).

## 12.9 How to run the checks yourself

You will need Docker running with the `hoshimono-db` container ([06-SETUP.md](../06-SETUP.md) section 6). The database tests and the e2e tests use the shared databases, so do not run them while someone else is using them.

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run lint`      | ESLint                                                           |
| `npm run typecheck` | Route types and TypeScript                                       |
| `npm test`          | Every Vitest test (unit and database)                            |
| `npm run check`     | All three above                                                  |
| `npm run test:e2e`  | Playwright (stop any running `next dev` first: both use `.next`) |

## Where to look in the code

| Topic               | File                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| Lint rules          | `eslint.config.mjs`, `tests/module-boundary.test.ts`                   |
| Vitest setup        | `vitest.config.mts`, `tests/db/global-setup.ts`, `tests/db/helpers.ts` |
| Playwright setup    | `playwright.config.ts`, `e2e/reset-db.mts`                             |
| CI                  | `.github/workflows/ci.yml`, `lighthouserc.json`                        |
| The pre-commit hook | `.husky/pre-commit`, `.lintstagedrc`                                   |

## Check yourself

<details>
<summary>Why are the race tests run against a real Postgres instead of a fake database?</summary>

The guarantee comes from the database: a guarded `UPDATE`, a row lock, a unique constraint. A fake would not lock or refuse the way Postgres does, so a test against it could pass while the real shop oversells.
</details>

<details>
<summary>A change makes the Product page load an extra 30 KB of JavaScript. Where would that be caught?</summary>

In CI's `lighthouse` job, if the extra code drops the median mobile performance score below 90, which fails the pull request. The JavaScript size itself is measured by hand at checkups against the budget in the design system.
</details>

<details>
<summary>Why do the e2e tests use the stand-in payment provider?</summary>

There are no PayMongo keys yet, and tests must not depend on an outside service. The stand-in sends the same kind of signed webhook PayMongo would, so the webhook handling, the pay page and refunds are all exercised. The real PayMongo run is still owed (Batch 6.3).
</details>
