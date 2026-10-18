# Setup Guide

Goal: from this folder of documents to a running Next.js dev server with a connected database, tests and hooks. Written for **Windows 10/11**. Commands are PowerShell unless stated. Expect about 90 minutes including account sign-ups.

## 1. Prerequisites

| Tool              | Needed                                              | Check           |
| ----------------- | --------------------------------------------------- | --------------- |
| Node.js           | Current LTS or newer (24.x on the dev machine)      | `node -v`       |
| npm               | Ships with Node (11.x on the dev machine)           | `npm -v`        |
| Git               | 2.40+                                               | `git --version` |
| VS Code or Cursor | Recommended                                         |                 |
| Docker Desktop    | Optional (local Postgres instead of a cloud branch) | `docker -v`     |

Not needed: pnpm or yarn. This project uses `npm`.

One-time Windows settings, run from inside the repo:

```powershell
git config core.autocrlf input
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

The first line is repo-local so your other projects are untouched; the committed `.gitattributes` (`* text=auto eol=lf`) keeps line endings as LF for everyone. The second line lets npm's PowerShell shims run. If you prefer not to change it, use Git Bash for npm commands.

## 2. Accounts to create

Create these up front; several take days to approve, so start the payment ones in Phase 0 even though code arrives in Phase 3.

| Service                     | For                                                           | Phase   | Notes                                                                                                      |
| --------------------------- | ------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| GitHub                      | Repo, CI, PRs                                                 | 0       | Private repository                                                                                         |
| Vercel                      | Hosting, preview deployments                                  | 0       | Connect to the GitHub repo                                                                                 |
| Neon                        | Managed Postgres ([ADR 0005](adr/0005-neon-postgres-host.md)) | 0       | Pick the Singapore region (`ap-southeast-1`) for latency to Manila; use branches for dev, preview and test |
| Google Cloud Console        | OAuth sign-in, Maps/Places key                                | 0 and 2 | Restrict keys by HTTP referrer and API                                                                     |
| Resend                      | Transactional email                                           | 2       | Verify your sending domain                                                                                 |
| Semaphore (or Twilio)       | SMS and OTP in the Philippines                                | 2       | Check sender-name registration lead time                                                                   |
| Xendit and/or PayMongo      | Payments                                                      | 3       | Business verification (KYC) can take weeks; start early                                                    |
| Sentry                      | Error tracking                                                | 0       | Free tier is enough                                                                                        |
| Cloudflare R2 or Cloudinary | Product image storage and CDN                                 | 1       | R2 is S3-compatible and cheap; Cloudinary transforms on the fly                                            |
| Domain registrar            | Production domain                                             | 6       | Point DNS to Vercel                                                                                        |

## 3. Scaffold the app

This folder already contains documents, and the Next.js scaffolder refuses to write into a folder with files that could conflict. Scaffold in a sibling folder, then copy in. The repo lives at `D:\Coding\projects\Personal\Hoshimono`.

```powershell
cd D:\Coding\projects\Personal
npx create-next-app@latest hoshimono-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git
```

Accept the defaults for any remaining prompts. Then merge it into the repo without overwriting anything we already have (`/XC /XN /XO` skips every file that exists in the repo, including `CLAUDE.md`, `README.md` and `.gitignore`). Do a dry run first with `/L` and read the list:

```powershell
robocopy hoshimono-scaffold Hoshimono /E /XC /XN /XO /XD node_modules .next /L
robocopy hoshimono-scaffold Hoshimono /E /XC /XN /XO /XD node_modules .next
Remove-Item -Recurse -Force hoshimono-scaffold
cd Hoshimono
npm install
npm run dev
```

Open http://localhost:3000. You should see the default Next.js page. Stop the server (Ctrl+C).

Delete any default content you will not use (`src/app/page.tsx` body, `public/*.svg`). Keep `src/app/layout.tsx`, but swap its default Geist fonts for Epilogue and Plus Jakarta Sans ([05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md) section 4).

## 4. Install the libraries

Install by phase so the dependency list always matches what the code uses. Phase 0 set:

```powershell
# UI
npx shadcn@latest init -t next -b radix -p nova --css-variables -y
# then set "iconLibrary": "phosphor" in components.json BEFORE adding components
npx shadcn@latest add button input label checkbox radio-group select textarea badge skeleton separator tabs accordion popover command dialog sheet drawer sonner form
npm install motion @phosphor-icons/react

# Data
npm install @prisma/client
npm install -D prisma tsx

# Forms and validation: install in Batch 1.4 (admin forms) when first used.
# @hookform/resolvers currently conflicts with Zod 4 through an optional peer; resolve it then.
# npm install zod react-hook-form @hookform/resolvers
# The shadcn `form` item did not install in Batch 0.2; check for `form` or `field` in 1.4.

# Auth
npm install better-auth

# Testing and quality
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test @axe-core/playwright prettier prettier-plugin-tailwindcss
npx playwright install chromium
```

Later phases: `resend @react-email/components` (2), the chosen payment SDK (3), `@tanstack/react-table` (4), `@sentry/nextjs` (0 or 6).

Verify package names and options against each library's current documentation as you install; major versions change install steps. For Prisma in particular, follow the official guide for the installed major version for the config file and client generation.

During `shadcn init`, choose the neutral base, CSS variables on, then replace its colour variables with the tokens in [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md) section 3.

## 5. Environment variables

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local`. Never commit it.

| Variable                                   | Meaning                                | Where it comes from                                                                           |
| ------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                      | Public base URL                        | `http://localhost:3000` locally                                                               |
| `NEXT_PUBLIC_BRAND_NAME`                   | Display name                           | Defaults to Hoshimono                                                                         |
| `DATABASE_URL`                             | Pooled Postgres URL used by the app    | Neon dashboard, pooled connection                                                             |
| `DIRECT_URL`                               | Direct Postgres URL used by migrations | Neon dashboard, direct connection                                                             |
| `BETTER_AUTH_SECRET`                       | Session signing secret                 | `openssl rand -base64 32` (Git Bash)                                                          |
| `BETTER_AUTH_URL`                          | Auth base URL                          | Same as app URL                                                                               |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in                         | Google Cloud OAuth credentials; redirect URI `http://localhost:3000/api/auth/callback/google` |
| `PAYMENT_PROVIDER`                         | `xendit` or `paymongo`                 | Decided in Phase 3                                                                            |
| `XENDIT_*`, `PAYMONGO_*`                   | Provider keys and webhook secrets      | Provider dashboards, **test mode keys only** until launch                                     |
| `RESEND_API_KEY`, `EMAIL_FROM`             | Email                                  | Resend                                                                                        |
| `SMS_PROVIDER`, `SEMAPHORE_API_KEY`        | SMS                                    | Semaphore                                                                                     |
| `MEDIA_BUCKET`, `MEDIA_PUBLIC_URL`         | Image storage                          | R2 or Cloudinary                                                                              |
| `GOOGLE_MAPS_API_KEY`                      | Address pin and autocomplete           | Google Cloud                                                                                  |
| `SENTRY_DSN`, `NEXT_PUBLIC_GA_ID`          | Observability and analytics            | Sentry, Google Analytics                                                                      |

Add the same variables to Vercel (Project Settings, Environment Variables), using separate values for Preview and Production.

## 6. Database

1. In Neon create a project in `ap-southeast-1`. Create branches `dev` and `test` from `main`.
2. Put the `dev` branch URLs in `.env.local`. Put the `test` branch URL in `.env.test` (git-ignored) for Vitest.
3. Prisma 7 is set up already (`prisma/schema.prisma`, `prisma.config.ts`, client generated into `src/generated/prisma` on `npm install`). Keep `prisma` and `@prisma/client` on the same version: in October 2026 npm tagged a Prisma 8 release candidate as `latest` for the CLI only, so always install with `prisma@^7`. `prisma.config.ts` loads `.env.local` itself. Then:

```powershell
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio
```

4. The first migration enables `pg_trgm` and `unaccent` and adds the CHECK constraints, partial unique indexes and generated search column by hand. After any schema change, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` must print an empty migration.
5. `npm test` runs database tests against the `hoshimono_test` database from `.env.test` (Docker must be running). The tests refuse any database whose name does not end in `_test`. Prisma blocks `migrate reset` from AI agents unless you consent in chat.

Local Postgres alternative (used while the Neon account is deferred). Port 5433 avoids clashing with a native Postgres on 5432, and the volume keeps data across container rebuilds:

```powershell
docker run --name hoshimono-db -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=hoshimono -v hoshimono-pgdata:/var/lib/postgresql/data -p 127.0.0.1:5433:5432 --restart unless-stopped -d postgres:17
docker exec hoshimono-db psql -U postgres -c "CREATE DATABASE hoshimono_test;"
docker exec hoshimono-db psql -U postgres -c "CREATE DATABASE hoshimono_e2e;"
```

Point `DATABASE_URL` and `DIRECT_URL` at `postgresql://postgres:dev@localhost:5433/hoshimono`, and the Vitest URL in `.env.test` at `postgresql://postgres:dev@localhost:5433/hoshimono_test`. `npm run test:e2e` starts its own dev server on port 3100 against `hoshimono_e2e`, which it migrates, empties and re-seeds on every run (stop any other `next dev` first: two dev servers cannot share `.next`). Uploaded Product photos land in `public/media/` (git-ignored) until the R2 store exists.

## 7. Scripts to define in `package.json`

| Script       | Command                                         | Purpose                               |
| ------------ | ----------------------------------------------- | ------------------------------------- |
| `dev`        | `next dev`                                      | Dev server                            |
| `build`      | `next build`                                    | Production build                      |
| `start`      | `next start`                                    | Run the build                         |
| `lint`       | `eslint .`                                      | Lint                                  |
| `typecheck`  | `tsc --noEmit`                                  | Types                                 |
| `format`     | `prettier --write .`                            | Format                                |
| `test`       | `vitest run`                                    | Unit and integration tests            |
| `test:watch` | `vitest`                                        | Watch mode                            |
| `test:e2e`   | `playwright test`                               | End-to-end tests                      |
| `db:migrate` | `prisma migrate dev`                            | Create and apply a migration locally  |
| `db:deploy`  | `prisma migrate deploy`                         | Apply migrations in CI and production |
| `db:seed`    | `prisma db seed`                                | Seed data                             |
| `db:studio`  | `prisma studio`                                 | Browse data                           |
| `check`      | `npm run lint && npm run typecheck && npm test` | The pre-push gate                     |

## 8. Git, hooks and CI

```powershell
git add -A
git status          # review before committing; confirm .env.local is not listed
```

Commit only when you are ready (Conventional Commits, for example `chore: scaffold next.js app`). Then:

1. Run the `setup-pre-commit` skill in Claude Code to install Husky, lint-staged (Prettier), type checking and tests on commit.
2. Agent sessions are guarded by `.claude/hooks/block-dangerous-git.mjs` (installed with the `git-guardrails-claude-code` skill, then narrowed on 2026-10-17 at the owner's request). Agents may push only as `git push [-u] origin <feature-branch>`. Pushes to `main`, force pushes, branch deletes, `reset --hard`, `clean -f`, `branch -D` and `gh pr merge` stay blocked, so the owner merges every pull request. `tests/guardrail.test.ts` pins these rules.
3. Create the GitHub repository, add the remote, push `main`, enable branch protection (PRs required, CI must pass).
4. Add `.github/workflows/ci.yml`: install, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Add the Playwright job from Phase 2.
5. Import the repository in Vercel; every pull request now gets a preview deployment.

## 9. Verify the foundation

Phase 0 is only done when all of these pass:

- [x] `npm run dev` serves a branded home shell at http://localhost:3000 in light and dark mode
- [x] `GET /api/health` returns `{ "ok": true }` and confirms the database connection
- [x] `npm run check` passes with at least one real test
- [x] A commit triggers the pre-commit hook
- [ ] A pull request produces a green CI run and a Vercel preview URL (CI green on PR #2; Vercel preview blocked until the account exists)
- [x] `npx prisma db seed` loads the seed data and Prisma Studio shows it

## 10. Troubleshooting

| Symptom                                           | Fix                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm.ps1 cannot be loaded`                        | Run the `Set-ExecutionPolicy` line in section 1, or use Git Bash                                 |
| `EPERM` or locked files in `.next`                | Stop the dev server and antivirus scan on the project folder; delete `.next`                     |
| `create-next-app` says the directory is not empty | Scaffold into `hoshimono-scaffold` as shown, do not scaffold in place                            |
| Port 3000 in use                                  | `npx kill-port 3000` or `npm run dev -- -p 3001`                                                 |
| Prisma cannot connect                             | Use `sslmode=require`; use `DIRECT_URL` for migrations and the pooled URL for the app            |
| CRLF warnings from Git                            | Section 1 `core.autocrlf input`; the repo already has `.gitattributes` with `* text=auto eol=lf` |
| Long paths error on `npm install`                 | `git config --system core.longpaths true` and enable Windows long paths                          |
