# Hoshimono

Online supermarket (Next.js + TypeScript + Postgres) for Metro Manila. Planning docs are complete; code is built phase by phase from `docs/07-ROADMAP.md`.

## Start of every task

1. Find the current phase in `docs/07-ROADMAP.md` and work only on its unchecked items.
2. Use words exactly as defined in `GLOSSARY.md` (Cart, Order, Hub, Slot, Substitution...). Add new domain words there before using them in code.
3. Check `docs/adr/` before reopening a decision. Contradicting an ADR needs a new ADR.

## Pointers

- **Product scope or "is X in the MVP?"** read `docs/01-PRD.md`.
- **Module boundaries, order states, payment or stock flow** read `docs/03-ARCHITECTURE.md`.
- **Tables, fields, constraints** read `docs/04-DATA-MODEL.md`.
- **Any UI work** read `docs/05-DESIGN-SYSTEM.md` and run the `design-taste-frontend` skill first.
- **Environment, env vars, scripts** read `docs/06-SETUP.md`.
- **Which skill fits which job** read `docs/08-TOOLING.md`.

## Rules that code and config cannot tell you

- **Money is integer centavos** (`PHP 59.00` is `5900`). Format only at the UI edge with `lib/money.ts`. See ADR 0002.
- **Modules own their tables.** Import another module only through its `index.ts`. Reaching into `modules/x/internal/` from outside `x` is a boundary violation.
- **Order lines snapshot price, name and tax at checkout.** Catalog edits never rewrite past orders.
- **Weighed items** (meat, fruit by kg) store an estimated weight at checkout and a final weight at pick. Cards authorise estimate plus 10% and capture the final amount; wallets charge the estimate and refund any difference (`docs/03-ARCHITECTURE.md` section 8).
- **Webhooks are idempotent.** Every payment webhook handler dedupes on the provider event id before touching an Order.
- **Server Components by default.** `"use client"` only for leaf components with state, Motion or browser APIs.
- **Prices, stock and totals are always recomputed on the server.** Treat client-sent totals as untrusted.
- **Dates:** store UTC, display `Asia/Manila`. Delivery Slots are defined in Manila local time.
- **`docs/concepts/` is frozen.** It holds design concepts kept for reference only (v3 "shelf tag", v4 "calm and premium", v5 "warm and homey"). Read it, never edit, move or delete it, and never build the app from it; the app follows v2 (`docs/05-DESIGN-SYSTEM.md`, `docs/mockup-v2/`).

## Environment

- Windows 10, Git Bash and PowerShell. Use `npm` (pnpm is not installed).
- Dev database is a managed Postgres branch on Neon (ADR 0005). Until that account exists: Docker container `hoshimono-db` on port 5433 (`hoshimono` for dev, `hoshimono_test` for Vitest); see `docs/06-SETUP.md` section 6.
- Never commit `.env*` except `.env.example`. Secrets only in `.env.local` and the hosting dashboard.

## Test and commit discipline

- Build pricing, cart, stock reservation, order state transitions and webhook handlers test-first with the `tdd` skill. Use Vitest against the real test database, not mocks, for anything touching Prisma.
- A phase is done when every exit criterion in the roadmap is observably met (run the app with the `run` skill and exercise the flow).
- Commit only when the user asks. Use Conventional Commits.

## Voice

Customer-facing copy: plain, warm, concrete, Filipino-English where natural. No em-dashes in UI copy.
