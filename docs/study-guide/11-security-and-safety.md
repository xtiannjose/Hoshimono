# 11. Security and safety

This chapter explains how Hoshimono decides who someone is, what they may do, how it limits abuse, how it knows a message really came from PayMongo or from itself, and how it keeps test tools away from a real shop. The formal security review is still to come (Batch 6.2, chapter 14); this is what is built today.

The baseline the PRD asks for: OWASP ASVS Level 1 (a standard checklist of web security basics), server-side price and stock checks, rate limits on sign-in, webhook signature checks, no card data on our servers, and the Philippine Data Privacy Act ([01-PRD.md](../01-PRD.md) section 7).

## 11.1 Signing in

Sign-in is handled by **Better Auth**, a sign-in library, configured in `src/modules/identity/internal/auth.ts`. It owns four tables: `auth_users`, `auth_sessions`, `auth_accounts` and `auth_verifications`. There are **no passwords** at Hoshimono. A person signs in one of three ways:

| Method                    | How it works                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email link ("magic link") | They type their email; we send a single-use link; opening it signs them in                                                                                                              |
| Text code (mobile OTP)    | They type a Philippine mobile number; we text a 6-digit code that works for 5 minutes and 3 tries. The first code sign-in creates the account, with a stand-in email that is never used |
| Google                    | Appears only once the Google keys (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) are set (a business track)                                                                               |

Today no email or SMS is really sent: links and codes appear in the server log, and in development `/dev/sign-in` signs in as any test account in one click (section 11.7).

**Sessions.** Once signed in, the browser holds a **session cookie**: HTTP-only (page scripts cannot read it), sent with every request. Better Auth also keeps a signed copy of the session in a cookie for 5 minutes, so the header, the page and its actions can check who is signed in without a database lookup each time. The cost: signing out on one device takes up to 5 minutes to reach the others.

**Linking a sign-in to a Customer.** `customers.customerForUser` (`src/modules/customers/internal/link.ts`) finds or creates the Customer row for a signed-in person. It links to an existing Customer **only by an email or mobile number that was verified** (proven by the link or the code). Otherwise anyone could type someone else's email and see their Orders. A mobile number already on another account stays there.

**Safe return addresses.** After sign-in the browser returns to the page it came from (`?next=/checkout`). `safeNext` in `src/modules/identity/internal/sign-in.ts` accepts only addresses on this site, and refuses backslashes and control characters, which some browsers would quietly turn into a jump to another site. Without this, a crafted link could send a Customer from our sign-in page to a fake one (an "open redirect").

## 11.2 Staff roles and areas

Staff are not created by signing up. An Admin adds a Staff row (email, name, role, mobile) at `/admin/staff`. The first time that person signs in with that email, verified, `activeStaff` (`src/modules/identity/internal/link.ts`) links the sign-in to the Staff row. A switched-off Staff member signs in to nothing.

Each role opens only its **areas** (least privilege, PRD ADM-11). The table lives in one place, `AREAS` in `src/modules/identity/internal/link.ts`:

| Area         | Screens                                 | Admin | Merchandiser | Content Editor | Dispatcher | Picker | Rider |
| ------------ | --------------------------------------- | :---: | :----------: | :------------: | :--------: | :----: | :---: |
| `orders`     | Order queue                             |  yes  |              |                |    yes     |        |       |
| `picking`    | Picking                                 |  yes  |              |                |            |  yes   |       |
| `dispatch`   | Dispatch board, Cash                    |  yes  |              |                |    yes     |        |       |
| `delivery`   | My deliveries                           |  yes  |              |                |            |        |  yes  |
| `stock`      | Stock                                   |  yes  |              |                |    yes     |        |       |
| `reports`    | Daily report                            |  yes  |              |                |    yes     |        |       |
| `claims`     | Freshness Claims                        |  yes  |              |                |    yes     |        |       |
| `setup`      | Zones and Slots                         |  yes  |              |                |            |        |       |
| `catalog`    | Products, Categories, import and export |  yes  |     yes      |                |            |        |       |
| `promotions` | Promotions, Vouchers                    |  yes  |     yes      |                |            |        |       |
| `content`    | Recipes, Articles                       |  yes  |              |      yes       |            |        |       |
| `refunds`    | Refunds to check                        |  yes  |              |                |            |        |       |
| `staff`      | Staff                                   |  yes  |              |                |            |        |       |
| `audit`      | Audit log                               |  yes  |              |                |            |        |       |

**How it is enforced.** Every staff page and every staff Server Action calls `requireStaff(area)` (`src/modules/identity/internal/session.ts`):

- Not signed in: redirect to sign-in.
- Signed in but not active Staff with that area: **404 Not found**. Not "forbidden": the screen does not even admit it exists.

The menu (`src/app/admin/admin-menu.tsx`) lists only the areas a role may open, but hiding a link is a convenience, not the protection; the check in every action is.

**Two layers.** Authorisation is checked in two places ([03-ARCHITECTURE.md](../03-ARCHITECTURE.md) section 12):

1. **At the door**: the page or Server Action (`requireCustomer`, `requireStaff`).
2. **At the data**: queries are filtered by the owner. `getOrder(customerId, orderNo)`, `getAddress(customerId, id)`, Shopping Lists and claims all include the Customer's id in the query, so even a missed check at the door cannot show another Customer's data. A Rider's `completeDelivery` checks the Order is assigned to that Rider.

There is no separate "middleware" layer guarding whole folders: Next.js 16 renders pages in pieces, and each page and action checks for itself.

**No lock-out.** An Admin cannot change their own role or switch their own account off ("You cannot change your own role."), so there is always at least one active Admin.

**The audit log.** Every staff write records who, what, and the values before and after (`audit_log`, `/admin/audit`), usually in the same transaction as the write (`adminWrite`, chapter 8).

## 11.3 Rate limits

A **rate limit** caps how often something may happen in a time window. Without them, a script could text thousands of sign-in codes (costing money and annoying people), guess codes, or fill the database with Carts.

Hoshimono counts in Postgres, in the `rate_limits` table ([ADR 0006](../adr/0006-postgres-rate-limit-store.md)). `takeToken(key, limit, windowSeconds)` in `src/lib/rate-limit.ts` is one atomic statement: insert a counter for the key, or add one to it, or restart it if its window has ended, and return the count. Concurrent requests are all counted, because the database does the adding. The cron tick deletes ended windows.

| What                 | Limit                                                                                                                          | Where                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Sign-in links        | 3 per inbox (Gmail dots and `+tags` count as one) and 30 per IP, per 15 minutes                                                | `src/app/[lang]/sign-in/limits.ts`           |
| Sign-in codes sent   | 3 per number from one IP and 30 per IP per 15 minutes; 10 per number a day; 200 for everyone an hour, then the email link only | same                                         |
| Sign-in code checks  | 10 per number from one IP, per 15 minutes (and 3 tries per code)                                                               | same                                         |
| Voucher codes tried  | 10 per IP and 10 per account, per 15 minutes                                                                                   | `src/app/[lang]/cart/actions.ts`             |
| Stock Alerts         | only for a sold-out Product, at most 20 open per Customer                                                                      | `src/modules/inventory/internal/alerts.ts`   |
| Unpaid online Orders | one at a time per Customer, and at most 200 items an Order                                                                     | `src/modules/orders/internal/place-order.ts` |
| Sign-in link checks  | 60 per IP per minute (Better Auth's own limit)                                                                                 | `src/modules/identity/internal/auth.ts`      |
| Order attempts       | 10 per Customer and 20 per IP, per hour                                                                                        | `src/app/[lang]/checkout/order-limits.ts`    |
| New Guest Carts      | 60 per IP per hour                                                                                                             | `src/app/[lang]/cart/owner.ts`               |
| Search suggestions   | 120 per IP per minute                                                                                                          | `src/app/api/search/suggest/route.ts`        |
| Funnel beacons       | 120 per IP per minute                                                                                                          | `src/app/api/events/route.ts`                |

Per-IP limits are generous on purpose: many Filipino phones on mobile data share one carrier IP address. The per-email, per-number and per-account limits do the real work.

**Closing the side doors.** Better Auth's own limiter only sees requests to `/api/auth/*`, not calls from our Server Actions. So the sending endpoints are switched off over HTTP (`disabledPaths` in `auth.ts`), and sign-in can only start from our rate-limited Server Actions.

## 11.4 Proving who sent a message: signatures and secrets

Several messages must be trusted without a signed-in person behind them. Each has its own proof:

| Message                        | Proof                                                                                                       | Where                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| PayMongo webhook               | HMAC-SHA256 of timestamp and raw body with `PAYMONGO_WEBHOOK_SECRET`; test keys accept only test signatures | `src/modules/payments/internal/paymongo.ts`         |
| Stand-in webhook (development) | HMAC with a fixed local secret; the stand-in is refused on a real domain                                    | `src/modules/payments/internal/fake.ts`             |
| Cron tick                      | `Authorization: Bearer <CRON_SECRET>`, compared in constant time; 404 otherwise                             | `src/app/api/cron/[job]/route.ts`                   |
| Cart Reminder stop link        | The Customer's id signed with HMAC and `BETTER_AUTH_SECRET`; a button press is still required               | `src/lib/signed.ts`, `src/app/[lang]/stop/[token]/` |
| Substitution answer link       | 24 random bytes, unguessable, opening one Substitution only, only during its window                         | `src/modules/orders/internal/picking.ts`            |
| Guest Cart                     | 256 random bits in an HTTP-only cookie; only its SHA-256 hash is stored                                     | `src/modules/cart/internal/cart.ts`                 |
| Delivery PIN                   | 4 random digits, new per trip, locked after 5 wrong tries                                                   | `src/modules/orders/internal/delivery.ts`           |

An **HMAC** is a fingerprint of a message made with a secret key. Anyone can compute a plain hash of a message, but only someone with the key can compute its HMAC. If the message is changed by one character, or the key is wrong, the fingerprint does not match. Comparisons are done in **constant time** (`timingSafeEqual`), so an attacker cannot learn how many characters of a guess were right from how long the check took.

Beyond the signature, the webhook handler also refuses to mark a Payment paid if the amount differs from what the Order asked for, and records each event once (chapter 7). The browser's return from PayMongo is never trusted for payment state.

## 11.5 Never trust the browser

The most important rule in the app ([CLAUDE.md](../../CLAUDE.md)), seen throughout this guide:

- **Prices, stock and totals are recomputed on the server.** `placeOrder` refuses an Order whose total differs from what the server computes (chapter 5).
- **Every Server Action checks its input**, usually with zod: ids must be real ids, quantities within 0 to 99, notes within their length. Ids are also checked with `isUuid` before any query.
- **Recipes and Reorder send choices, not counts.** The server works out how many to add (chapter 9).
- **Freshness Claims never take an amount from the Customer.** The server values them (chapter 9).
- **Card details never reach our servers.** Payment happens on PayMongo's hosted page (chapter 7).
- **Raw SQL is written as tagged templates**, so values can never be read as SQL commands (chapter 2).
- **Uploaded files cannot escape their folder.** The media store refuses a file name that would land outside `public/media` (`src/lib/media.ts`), photos are re-encoded by `sharp`, and uploads are capped (Product photos 10 MB, claim photos 8 MB).

## 11.6 Secrets and settings

An **environment variable** is a setting given to the app from outside the code: a database address, a secret key. Locally they live in `.env.local`, which is never committed to git ([CLAUDE.md](../../CLAUDE.md)); at launch they go into Vercel's dashboard. `.env.example` lists every one, with empty values. The ones that matter for security:

| Variable                                   | What it guards                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                       | Signs sessions and the stop links; leaking it would let someone forge them                                  |
| `CRON_SECRET`                              | Who may run the cron tick                                                                                   |
| `PAYMONGO_SECRET_KEY`                      | Creating checkouts and refunds at PayMongo; the `sk_live_` or `sk_test_` prefix also picks the webhook mode |
| `PAYMONGO_WEBHOOK_SECRET`                  | Verifying PayMongo's webhooks                                                                               |
| `DATABASE_URL`, `DIRECT_URL`               | The database                                                                                                |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in                                                                                              |

A variable whose name starts with `NEXT_PUBLIC_` (such as `NEXT_PUBLIC_APP_URL`) is copied into the code the browser downloads at build time. It is public by design, so no secret may ever have that prefix.

## 11.7 Test-mode guards

The app carries tools that make development and testing possible but would be dangerous on a real shop: console email and SMS (which never reach a person), an in-memory mailbox that hands out sign-in links, one-click sign-in as any test account, and a stand-in payment provider that marks Orders paid without money.

All of them pass through two functions in `src/lib/test-mode.ts`:

- `consoleMessagesAllowed()`: never on Vercel (any deployment there is on the internet, whatever `NODE_ENV` says); otherwise true in development, or in a production build only when `E2E_MAILBOX=1` **and** the app's address is `localhost` or `127.0.0.1`.
- `testMailboxEnabled()`: true only when `E2E_MAILBOX=1` and the above holds.

The key detail: the app's address (`NEXT_PUBLIC_APP_URL`) is baked into the build. A build made for `hoshimono.ph` can never pass the localhost test, even if someone set `E2E_MAILBOX=1` there by mistake.

| Tool                                     | Guard                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Console email and SMS                    | Throw "No email provider configured for production." outside allowed builds                                    |
| `/api/dev/mailbox` (tests read messages) | 404 unless `testMailboxEnabled()`                                                                              |
| `/dev/sign-in` (one-click test accounts) | 404 unless `testMailboxEnabled()`                                                                              |
| The stand-in payment provider            | `paymentProvider("fake")` returns nothing unless `consoleMessagesAllowed()`; its pay page and actions then 404 |

The test databases have a guard too: the database tests refuse to run against any database whose name does not end in `_test`, because they wipe tables (`tests/db/helpers.ts`).

## 11.8 Privacy

- **Consent for marketing.** Cart Reminders need the Customer's "reminders and offers" switch, off by default; every reminder has a stop link (chapter 9).
- **The Funnel stores no personal data**: counts per day, no identifier, cookie or third party (chapter 9).
- **The shop never shows stock counts**, only "in stock", "only a few left" or "out".
- **Referral pages show friends' first names only.**
- **Order Notes are Staff-only**; the Customer never sees them.

Still to do before launch (Batch 6.3): the privacy policy, terms, refund policy and cookie consent page, and a way to export or delete a Customer's data on request (PRD section 7).

## Where to look in the code

| Topic                      | File                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Sign-in setup              | `src/modules/identity/internal/auth.ts`                                                                                        |
| Sign-in actions and limits | `src/app/[lang]/sign-in/actions.ts`                                                                                            |
| Sessions, `requireStaff`   | `src/modules/identity/internal/session.ts`                                                                                     |
| Roles and areas            | `src/modules/identity/internal/link.ts`                                                                                        |
| Linking a Customer         | `src/modules/customers/internal/link.ts`                                                                                       |
| Staff management           | `src/modules/identity/internal/staff.ts`, `src/app/admin/staff/`                                                               |
| Rate limits                | `src/lib/rate-limit.ts`                                                                                                        |
| Signed values              | `src/lib/signed.ts`                                                                                                            |
| Test-mode guards           | `src/lib/test-mode.ts` (tests: `src/lib/test-mode.test.ts`)                                                                    |
| The tests                  | `tests/db/identity.test.ts`, `tests/db/rate-limit.test.ts`, `e2e/auth.spec.ts`, `e2e/staff.spec.ts`, `e2e/dev-sign-in.spec.ts` |

## Check yourself

<details>
<summary>A Picker types <code>/admin/refunds</code> into the address bar. What do they see?</summary>

A "not found" page. `requireStaff("refunds")` finds the Picker is not allowed that area and answers 404, revealing nothing about the screen.
</details>

<details>
<summary>Someone creates an account with the email of an existing Customer, but never opens the link. Can they see that Customer's Orders?</summary>

No. `customerForUser` links to an existing Customer only by a verified email or number. An unverified sign-in never reaches that Customer's row.
</details>

<details>
<summary>Someone deploys a build to the real domain with <code>E2E_MAILBOX=1</code> by mistake. Does one-click sign-in work there?</summary>

No. The build's app address is the real domain, not localhost, so `consoleMessagesAllowed()` and `testMailboxEnabled()` are false. `/dev/sign-in` answers 404, and the console message providers refuse to run.
</details>

## 11.8 The security review (Batch 6.2)

A review of the whole app on 27 Oct 2026 looked for attacks that actually work. It found no critical problem; the high and medium ones (Stock Alerts that could flood the jobs queue, unpaid online Orders that could hold all the stock, sign-in codes as an SMS bomb) are fixed, with the limits in the table above. The full list, what was fixed and what was accepted is in [`docs/security-review.md`](../security-review.md).
