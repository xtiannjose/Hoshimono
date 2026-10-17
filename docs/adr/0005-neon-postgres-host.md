---
status: accepted
---

# Neon hosts the PostgreSQL database

We use Neon in the Singapore region (`aws-ap-southeast-1`) for every environment: production, dev, test and one branch per preview deployment. Neon is plain PostgreSQL, so `pg_trgm`, `unaccent`, transactions and the raw SQL in [ADR 0004](0004-postgres-prisma.md) work unchanged. Its Vercel integration creates a database branch for each pull request, which is what the roadmap's "every PR gets its own preview and DB branch" needs.

## Considered options

- **Supabase.** Rejected: its main extras are Auth, Storage and realtime, and we already use Better Auth and decide object storage separately (Batch 1.4). We would pay for features we do not use and run two auth systems side by side.
- **Self-hosted or Docker Postgres.** Kept as an optional local fallback only (see `06-SETUP.md` section 6). Not used for preview or production.

## Consequences

- Two connection strings per environment: pooled `DATABASE_URL` for the app, direct `DIRECT_URL` for migrations.
- Branches: `main` (production), `dev`, `test` (Vitest), and one per preview deployment. Seed data loads on `dev` and `test` only.
- Dev branches may scale to zero and pause. Check the production compute settings before launch (Phase 6) so a cold start never hits a Customer at checkout.
- No Neon-specific SQL. Moving to another PostgreSQL host later means changing connection strings and the branch workflow, not code.
