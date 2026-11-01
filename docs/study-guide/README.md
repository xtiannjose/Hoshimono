# Hoshimono study guide

This guide explains the whole Hoshimono app for its owner: how the business runs inside the software, what every part of the code owns, how a tap on a phone becomes a row in the database, and why each design choice was made. It is written for study, not for a quick look. Read it next to the code: every chapter names the files it describes, so you can open them side by side.

**What it describes.** The code as of 29 October 2026 on the branch `phase-5/filipino-messages`, which holds everything on `main` plus every branch after it (roadmap section 0). Those branches are not merged into `main` yet: there is no git host for now, and the code lives in Google Drive ([chapter 14](14-not-built-yet.md)). If you read the code on `main` instead, Freshness Claims, Filipino pages, the installable app, the Funnel, the design pass and all of Phase 6 will be missing.

**Words.** Business words (Cart, Order, Hub, Slot, Substitution and so on) are used exactly as the [glossary](../../GLOSSARY.md) defines them. This guide links to the glossary instead of repeating it. Technical words are explained the first time they appear, and the table at the end of this page points to each explanation.

## Reading order

Read the chapters in order the first time. Each one builds on the words and ideas of the ones before it.

| #   | Chapter                                            | What you will understand after it                                                                                                                     | Time   |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | [The business](01-the-business.md)                 | Hubs, Zones, Slots, the Staff roles, and where the money goes, in business terms with no code                                                         | 30 min |
| 2   | [The building blocks](02-building-blocks.md)       | The tools the app is made of (Next.js, React, Prisma, Postgres) and where each lives in `src/`                                                        | 45 min |
| 3   | [The modules](03-modules.md)                       | The 13 modules, the tables each owns, the boundary rule, and how a module says no                                                                     | 45 min |
| 4   | [A request's journey](04-a-request-journey.md)     | One real tap on "Add", followed through every file from the button to the database and back                                                           | 45 min |
| 5   | [Money](05-money.md)                               | Centavos, VAT, `priceCart`, Promotions and Vouchers, the Final Total, and why the server recomputes every total                                       | 45 min |
| 6   | [Cart and Checkout](06-cart-and-checkout.md)       | Guest Carts, the merge on sign-in, Slot Holds, `placeOrder`, and how two shoppers can never get the last unit                                         | 60 min |
| 7   | [Payments and refunds](07-payments-and-refunds.md) | Cash on delivery, PayMongo, webhooks, the Payment Window, weighed items and refunds sent at most once                                                 | 60 min |
| 8   | [Hub operations](08-hub-operations.md)             | The Order states, Picking and Substitutions, dispatch with the Delivery PIN, cash, stock, Slots, reports and prints                                   | 60 min |
| 9   | [Growth features](09-growth-features.md)           | Recipes, Reorder, Shopping Lists, Cart Reminders, Stock Alerts, Promotions, Vouchers, Referrals, Claims, Filipino, the installable app and the Funnel | 60 min |
| 10  | [Background work](10-background-work.md)           | The jobs outbox, the cron tick that runs every minute, and every message the app sends                                                                | 30 min |
| 11  | [Security and safety](11-security-and-safety.md)   | Sign-in, Staff roles and areas, rate limits, signatures, and the guards that keep test tools off a real domain                                        | 40 min |
| 12  | [Testing and quality](12-testing-and-quality.md)   | Vitest against a real database, Playwright, CI, the pre-commit hook and Lighthouse                                                                    | 30 min |
| 13  | [Decisions](13-decisions.md)                       | All 18 ADRs: what was decided, why, and what it costs                                                                                                 | 45 min |
| 14  | [What is not built yet](14-not-built-yet.md)       | What is left before launch, what is blocked and on whom                                                                                               | 20 min |

If you only have an hour, read chapters 1, 4 and 14. If you want to understand why the shop cannot oversell or double-charge, read 6 and 7 closely.

## How to read the diagrams

The diagrams are written in [Mermaid](https://mermaid.js.org/), a text format that GitHub, VS Code (with a Mermaid extension) and most Markdown viewers draw as pictures. Three kinds appear:

- **Flowcharts** show parts and arrows. An arrow means "uses" or "leads to".
- **Sequence diagrams** show a conversation over time, top to bottom. Each column is a participant (the browser, a module, the database). Each arrow is one message. A dashed arrow is an answer. A box marked `alt` shows "either this or that", `loop` shows repetition, and `Note` adds an explanation.
- **State diagrams** show the states something can be in (an Order is `confirmed`, then `picking`) and the allowed moves between them.

## How to read the code next to this guide

- Paths like `src/modules/orders/internal/place-order.ts` are relative to the repository root. Open them in VS Code with Ctrl+P and paste the path.
- Folders in square brackets, such as `src/app/[lang]/cart/`, are real folder names. The brackets tell Next.js that this part of the web address varies (chapter 2).
- Function names are written like `placeOrder`. Search for them with Ctrl+Shift+F.
- Comments in the code explain why, not what. When a comment says `shortcut:` or `ponytail:`, the author is marking a known simplification with its limit, on purpose.

## Where else to look

| Document                                      | What it is for                                                        |
| --------------------------------------------- | --------------------------------------------------------------------- |
| [GLOSSARY.md](../../GLOSSARY.md)              | The meaning of every business word                                    |
| [01-PRD.md](../01-PRD.md)                     | What the product must do, with requirement IDs such as CHK-2          |
| [03-ARCHITECTURE.md](../03-ARCHITECTURE.md)   | The technical design, kept up to date batch by batch                  |
| [04-DATA-MODEL.md](../04-DATA-MODEL.md)       | The reasoning behind the tables; `prisma/schema.prisma` is the source |
| [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) | Colours, type, components, accessibility and performance budgets      |
| [06-SETUP.md](../06-SETUP.md)                 | How to run the app on a computer, with the test accounts              |
| [07-ROADMAP.md](../07-ROADMAP.md)             | The build plan, what is done and what is next                         |
| [docs/adr/](../adr/)                          | The 18 decision records, summarised in chapter 13                     |

## Technical words, quick reference

Each word is explained in full in the chapter named.

| Word                    | In one line                                                                                          | Chapter |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| Server, browser         | The computer that runs the app for everyone, and the program on the Customer's phone that shows it   | 2       |
| Database, table, row    | Where everything is stored: tables like spreadsheets, one row per thing                              | 2       |
| Next.js, React          | The framework the whole app is built with, and the library that draws the screens                    | 2       |
| Route, page, layout     | A web address, the screen at that address, and the frame around a group of screens                   | 2       |
| Server Component        | A piece of screen built on the server; it can read the database and sends only HTML                  | 2       |
| Client Component        | A piece of screen that runs in the browser for taps, animation and instant feedback (`"use client"`) | 2       |
| Server Action           | A server function a button or form calls directly (`"use server"`)                                   | 2       |
| Route handler           | A plain web address that answers machines: webhooks, cron, health (`route.ts`)                       | 2       |
| Proxy                   | Code that sees every request first; here it handles the language in the address (`src/proxy.ts`)     | 2       |
| Prisma                  | The library that turns TypeScript calls into database queries, and manages table changes             | 2       |
| Migration               | A file of database changes, applied once, in order                                                   | 2       |
| SQL, raw SQL            | The database's own language; written by hand where safety under load matters                         | 2       |
| Transaction             | A group of database changes that all happen or none do                                               | 2       |
| Row lock (`FOR UPDATE`) | A transaction's claim on a row so others wait their turn                                             | 6       |
| Guarded update          | One `UPDATE ... WHERE` that only succeeds if a condition still holds, such as stock still free       | 6       |
| Idempotent              | Safe to do twice: the second time changes nothing                                                    | 6       |
| Cache, tag              | A saved copy of a page or query, and a label used to throw it away when data changes                 | 2       |
| Module, interface       | A folder that owns one business area, and the short list of functions it lets others call            | 3       |
| Optimistic update       | Showing the expected result at once, then correcting it when the server answers                      | 4       |
| Cookie                  | A small value the browser keeps for a site and sends back with every request                         | 4       |
| Hash, HMAC              | A one-way fingerprint of a value, and a fingerprint made with a secret key, used as a signature      | 6, 7    |
| Webhook                 | A message a provider (PayMongo) sends to our server when something happens                           | 7       |
| Hosted checkout         | A payment page run by the provider, so card numbers never touch our servers                          | 7       |
| Outbox, job             | A table of work to do after a change commits; one row per job                                        | 10      |
| Cron                    | A timer on the host that calls our address every minute                                              | 10      |
| Rate limit              | A cap on how often something may happen, such as 3 sign-in codes per 15 minutes                      | 11      |
| Environment variable    | A setting given to the app from outside the code, such as a secret key                               | 11      |
| Unit test, e2e test     | A check of one piece of code, and a check that drives a real browser through a whole journey         | 12      |
| CI                      | Checks that run on every pull request on a clean computer                                            | 12      |
