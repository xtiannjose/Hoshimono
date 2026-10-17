# Hoshimono

Online supermarket for Metro Manila households: browse 5,000+ groceries, fill a cart, pick a delivery slot, pay with GCash, card or cash on delivery, and get fresh produce from a local fulfilment hub the same day.

**Hoshimono** is the brand name, confirmed on 2026-10-17; it replaced the working name "Sariwa". The brand lives in one config file (`src/config/brand.ts`, created in Phase 0), so changing it later stays a five-minute job.

> **Status:** planning complete, code not started. Mockup and all foundation documents exist. Next step is Phase 0 in [docs/07-ROADMAP.md](docs/07-ROADMAP.md).

## Why this exists

[BuiltaMart](https://builtamart.com) proved the model: a premium e-grocer running from a single fulfilment hub with a flat delivery fee, own website plus aggregator channels. Hoshimono is our own version of that idea, built on our tooling, with a better cart experience (recipe-to-cart, substitution control, weighed-item price holds). The full teardown is in [docs/02-RESEARCH-BUILTAMART.md](docs/02-RESEARCH-BUILTAMART.md).

## Assumptions to confirm

These shaped every document. Change them in one place ([docs/01-PRD.md](docs/01-PRD.md), section 2) and the rest follows.

| Assumption | Value |
|---|---|
| Market | Metro Manila, Philippines |
| Currency / locale / timezone | PHP, `en-PH`, `Asia/Manila` |
| Fulfilment | Own hub(s), no walk-in customers (dark store model) |
| Payments | GCash, cards, cash on delivery |
| Delivery fee | Flat fee per order, default PHP 59, configurable |
| Team | Small (1 to 3 developers), Windows dev machines |

## Stack at a glance

| Layer | Choice | Decision record |
|---|---|---|
| App | Next.js (App Router), TypeScript, one deployable | [ADR 0001](docs/adr/0001-modular-monolith-nextjs.md) |
| UI | Tailwind CSS v4, shadcn/ui (customised), Motion, Phosphor icons, Epilogue + Plus Jakarta Sans | [docs/05-DESIGN-SYSTEM.md](docs/05-DESIGN-SYSTEM.md) |
| Data | PostgreSQL + Prisma | [ADR 0004](docs/adr/0004-postgres-prisma.md) |
| Money | Integer centavos, never floats | [ADR 0002](docs/adr/0002-money-as-integer-centavos.md) |
| Payments | Xendit or PayMongo behind a `PaymentProvider` interface | [ADR 0003](docs/adr/0003-payment-provider-interface.md) |
| Auth | Email/phone OTP + Google, via Better Auth | [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) |
| Tests | Vitest (unit/integration), Playwright (end to end) | [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) |
| Hosting | Vercel + managed Postgres (Singapore region) | [docs/06-SETUP.md](docs/06-SETUP.md) |
| Mobile | Installable web app (PWA) in Phase 5; a native Flutter app is a frozen future concept | [docs/concepts/flutter-mobile/](docs/concepts/flutter-mobile/README.md) |

## Document map

Read in this order the first time.

| # | Document | Answers |
|---|---|---|
| 1 | [docs/01-PRD.md](docs/01-PRD.md) | What are we building, for whom, and what is in or out of the MVP? |
| 2 | [docs/02-RESEARCH-BUILTAMART.md](docs/02-RESEARCH-BUILTAMART.md) | What does the reference site do, and where do we differ? |
| 3 | [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) | How is it structured, and how do orders, payments and stock flow? |
| 4 | [docs/04-DATA-MODEL.md](docs/04-DATA-MODEL.md) | What are the entities and the rules that keep the data honest? |
| 5 | [docs/05-DESIGN-SYSTEM.md](docs/05-DESIGN-SYSTEM.md) | Colour, type, components, motion, accessibility. |
| 6 | [docs/06-SETUP.md](docs/06-SETUP.md) | How do I get a working dev environment from zero? |
| 7 | [docs/07-ROADMAP.md](docs/07-ROADMAP.md) | What do we build, in what order, and when is each phase done? |
| 8 | [docs/08-TOOLING.md](docs/08-TOOLING.md) | Which Claude skills, plugins and libraries do we use for which job? |
| - | [GLOSSARY.md](GLOSSARY.md) | The exact words we use for domain concepts. |
| - | [CLAUDE.md](CLAUDE.md) | Instructions for AI agents working in this repo. |
| - | [docs/adr/](docs/adr/) | Architecture decisions that are hard to reverse. |
| - | [docs/mockup-v2/](docs/mockup-v2/README.md) | Storefront mockup (v2, current) and how to view it. v1 is in [docs/mockup/](docs/mockup/README.md). |
| - | [docs/concepts/](docs/concepts/) | Frozen concepts kept for reference: design directions v3, v4, v5 and the Flutter app plan. Read only. |

## Planned repository layout

```
hoshimono/
  src/
    app/                 Next.js routes (storefront, account, checkout, admin, api)
    modules/             Business logic, one folder per domain (catalog, cart, ...)
    components/          Shared UI (ui/ = design-system primitives)
    config/              brand.ts, delivery.ts, feature flags
    lib/                 db client, money, dates, logging
  prisma/                schema.prisma, migrations, seed
  tests/                 e2e (Playwright)
  docs/                  everything you are reading
```

## Getting started

Code is not scaffolded yet. Follow [docs/06-SETUP.md](docs/06-SETUP.md): it takes you from a clean Windows machine to a running dev server, one command at a time.

## Contributing

Work happens in the phases listed in the roadmap. Rules of the road are in [CLAUDE.md](CLAUDE.md) (they apply to humans too): modules talk through their public interface, money is integer centavos, new domain words go in the glossary first, and every phase ends with its exit criteria met.
