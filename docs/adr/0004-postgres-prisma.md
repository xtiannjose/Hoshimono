---
status: accepted
---

# PostgreSQL as the only datastore, accessed with Prisma

Stock reservation, Slot capacity and payment idempotency need real transactions and database constraints, and catalogue search needs full-text and trigram matching. PostgreSQL covers all of it, so there is no separate search or cache service in the MVP. Prisma gives typed queries and migrations that a small team can move fast with.

## Considered options

- **Drizzle** is a reasonable alternative with closer-to-SQL ergonomics. Prisma was chosen for migration tooling and team familiarity; the data access layer is confined to modules, so the choice can be revisited per module.
- **MongoDB or SQLite.** Rejected: weaker constraint and concurrency guarantees for inventory and orders.
- **A dedicated search engine (Meilisearch, Typesense) from day one.** Deferred: Postgres full-text plus trigram is enough for the launch range; `SearchIndex` is an interface so swapping is contained.

## Consequences

- Guarded atomic updates (reserve stock, book a Slot) are written as raw SQL via Prisma's raw query API inside `inventory` and `delivery`, because the ORM's read-then-write patterns are not safe under concurrency.
- The invariants in `04-DATA-MODEL.md` section 4 are enforced as database constraints, applied through hand-edited migration SQL where Prisma's schema language cannot express them (check constraints, partial unique indexes, extensions).
- Dev, test and preview environments use database branches, so each needs its own connection string.
