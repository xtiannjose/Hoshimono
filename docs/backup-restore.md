# Backups and restore

Batch 6.1: backups, and a restore that has been tried, before real Orders exist. The runbook (`docs/runbook.md`) sends you here when the database is lost or wrong.

## Two kinds of backup

1. **Neon's own history** (point-in-time restore, ADR 0005). Neon keeps every change for a window that depends on the plan, and can make a copy of the database as it was at any moment in that window. This is the first thing to reach for: it loses at most seconds. Before launch, choose a plan whose window covers at least 7 days, so a mistake found after a weekend can still be undone. Check the window on Neon's pricing page when the account is made; it is not confirmed here.
2. **Our own copy** (`pg_dump`), kept outside Neon, for when Neon itself is the problem: an account locked, a project deleted, a region down. Take one every day and keep 30 days of them in object storage (Cloudflare R2, the media bucket's account, a separate bucket). Until R2 exists, keep the weekly copy on the owner's computer.

A backup nobody has restored is a hope, not a backup. Run the drill below every month and after any schema change, and write the date in the log at the bottom.

## The drill: `npm run db:restore-drill`

`scripts/restore-drill.sh` dumps a database with `pg_dump`, restores the dump into a scratch database `hoshimono_restore` in the local Docker container, and compares every table's row count. It needs only Docker (the Postgres tools come from the `postgres:17` image).

- Local dev database (the default): `npm run db:restore-drill`
- Any other database, such as a Neon branch: `SOURCE_URL="postgresql://...neon.tech/neondb?sslmode=require" npm run db:restore-drill`
- Keep the dump file in `backups/` (ignored by git): add `KEEP_DUMP=1`

On a live database, tables that move every minute (`jobs`, `rate_limits`, `slot_holds`) can differ by a few rows between the dump and the count; every other table must match.

## Restoring for real

**Something was deleted or changed by mistake** (a wrong import, a bad script):

1. Note the time just before the mistake, in Manila time, and convert it to UTC.
2. In the Neon console, restore the production branch to that time (or create a branch from that time and compare first). Neon keeps a copy of the branch as it was before the restore, so this step can be undone.
3. Orders placed between the mistake and the restore are lost from the database. Find them in the payment provider's dashboard and the notifications log before restoring, and re-enter or refund them (`docs/runbook.md`).

**Neon is gone** (account or project lost):

1. Create a new Postgres database (Neon or any host on Postgres 17).
2. `pg_restore --no-owner --no-privileges --dbname="<new url>" hoshimono-<date>.dump` from the newest daily copy.
3. Set `DATABASE_URL` and `DIRECT_URL` in Vercel to the new database and redeploy.
4. Everything since that copy is lost; follow step 3 above.

## Drill log

| Date       | Database                              | Size   | Dump | Restore | Result                         | By     |
| ---------- | ------------------------------------- | ------ | ---- | ------- | ------------------------------ | ------ |
| 2026-10-27 | Local dev (seeded, 20 dry-run Orders) | 180 KB | 32 s | 21 s    | 46 tables, every count matches | Claude |
