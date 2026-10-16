# Setup Guide

Goal: from this folder of documents to a running Next.js dev server with a connected database, tests and hooks. Written for **Windows 10/11**. Commands are PowerShell unless stated. Expect about 90 minutes including account sign-ups.

## 1. Prerequisites

| Tool | Needed | Check |
|---|---|---|
| Node.js | Current LTS or newer (24.x on the dev machine) | `node -v` |
| npm | Ships with Node (11.x on the dev machine) | `npm -v` |
| Git | 2.40+ | `git --version` |
| VS Code or Cursor | Recommended | |
| Docker Desktop | Optional (local Postgres instead of a cloud branch) | `docker -v` |

Not needed: pnpm or yarn. This project uses `npm`.

One-time Windows settings:

```powershell
git config --global core.autocrlf input
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

The second line lets npm's PowerShell shims run. If you prefer not to change it, use Git Bash for npm commands.

## 2. Accounts to create

Create these up front; several take days to approve, so start the payment ones in Phase 0 even though code arrives in Phase 3.

| Service | For | Phase | Notes |
|---|---|---|---|
| GitHub | Repo, CI, PRs | 0 | Private repository |
| Vercel | Hosting, preview deployments | 0 | Connect to the GitHub repo |
| Neon (or Supabase) | Managed Postgres | 0 | Pick the Singapore region (`ap-southeast-1`) for latency to Manila; use branches for dev, preview and test |
| Google Cloud Console | OAuth sign-in, Maps/Places key | 0 and 2 | Restrict keys by HTTP referrer and API |
| Resend | Transactional email | 2 | Verify your sending domain |
| Semaphore (or Twilio) | SMS and OTP in the Philippines | 2 | Check sender-name registration lead time |
| Xendit and/or PayMongo | Payments | 3 | Business verification (KYC) can take weeks; start early |
| Sentry | Error tracking | 0 | Free tier is enough |
| Cloudflare R2 or Cloudinary | Product image storage and CDN | 1 | R2 is S3-compatible and cheap; Cloudinary transforms on the fly |
| Domain registrar | Production domain | 6 | Point DNS to Vercel |

## 3. Scaffold the app

This folder already contains documents, and the Next.js scaffolder refuses to write into a folder with files that could conflict. Scaffold next door, then copy in.

```powershell
cd C:\Users\xtian\Projects
npx create-next-app@latest sariwa-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git
```

Accept the defaults for any remaining prompts. Then merge it into the repo without overwriting our documents:

```powershell
robocopy sariwa-scaffold sariwa /E /XD node_modules .next /XF README.md .gitignore
Remove-Item -Recurse -Force sariwa-scaffold
cd sariwa
npm install
npm run dev
```

Open http://localhost:3000. You should see the default Next.js page. Stop the server (Ctrl+C).

Delete any default content you will not use (`src/app/page.tsx` body, `public/*.svg`). Keep `src/app/layout.tsx`; it already loads Geist through `next/font`.

## 4. Install the libraries

Install by phase so the dependency list always matches what the code uses. Phase 0 set:

```powershell
# UI
npx shadcn@latest init
npx shadcn@latest add button input label checkbox radio-group select textarea badge skeleton separator tabs accordion popover command dialog sheet drawer sonner form
npm install motion @phosphor-icons/react

# Data, validation, forms
npm install @prisma/client zod react-hook-form @hookform/resolvers
npm install -D prisma tsx

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

| Variable | Meaning | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public base URL | `http://localhost:3000` locally |
| `NEXT_PUBLIC_BRAND_NAME` | Display name | Defaults to Sariwa |
| `DATABASE_URL` | Pooled Postgres URL used by the app | Neon dashboard, pooled connection |
| `DIRECT_URL` | Direct Postgres URL used by migrations | Neon dashboard, direct connection |
| `BETTER_AUTH_SECRET` | Session signing secret | `openssl rand -base64 32` (Git Bash) |
| `BETTER_AUTH_URL` | Auth base URL | Same as app URL |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in | Google Cloud OAuth credentials; redirect URI `http://localhost:3000/api/auth/callback/google` |
| `PAYMENT_PROVIDER` | `xendit` or `paymongo` | Decided in Phase 3 |
| `XENDIT_*`, `PAYMONGO_*` | Provider keys and webhook secrets | Provider dashboards, **test mode keys only** until launch |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email | Resend |
| `SMS_PROVIDER`, `SEMAPHORE_API_KEY` | SMS | Semaphore |
| `MEDIA_BUCKET`, `MEDIA_PUBLIC_URL` | Image storage | R2 or Cloudinary |
| `GOOGLE_MAPS_API_KEY` | Address pin and autocomplete | Google Cloud |
| `SENTRY_DSN`, `NEXT_PUBLIC_GA_ID` | Observability and analytics | Sentry, Google Analytics |

Add the same variables to Vercel (Project Settings, Environment Variables), using separate values for Preview and Production.

## 6. Database

1. In Neon create a project in `ap-southeast-1`. Create branches `dev` and `test` from `main`.
2. Put the `dev` branch URLs in `.env.local`. Put the `test` branch URL in `.env.test` (git-ignored) for Vitest.
3. Initialise Prisma (`npx prisma init`), write `prisma/schema.prisma` from [04-DATA-MODEL.md](04-DATA-MODEL.md), then:

```powershell
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio
```

4. Enable extensions in the first migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;`.

Local Postgres alternative: `docker run --name sariwa-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:17`, then point `DATABASE_URL` and `DIRECT_URL` at `postgresql://postgres:dev@localhost:5432/postgres`.

## 7. Scripts to define in `package.json`

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Run the build |
| `lint` | `eslint .` | Lint |
| `typecheck` | `tsc --noEmit` | Types |
| `format` | `prettier --write .` | Format |
| `test` | `vitest run` | Unit and integration tests |
| `test:watch` | `vitest` | Watch mode |
| `test:e2e` | `playwright test` | End-to-end tests |
| `db:migrate` | `prisma migrate dev` | Create and apply a migration locally |
| `db:deploy` | `prisma migrate deploy` | Apply migrations in CI and production |
| `db:seed` | `prisma db seed` | Seed data |
| `db:studio` | `prisma studio` | Browse data |
| `check` | `npm run lint && npm run typecheck && npm test` | The pre-push gate |

## 8. Git, hooks and CI

```powershell
git add -A
git status          # review before committing; confirm .env.local is not listed
```

Commit only when you are ready (Conventional Commits, for example `chore: scaffold next.js app`). Then:

1. Run the `setup-pre-commit` skill in Claude Code to install Husky, lint-staged (Prettier), type checking and tests on commit.
2. Run the `git-guardrails-claude-code` skill to block `git push`, `reset --hard`, `clean` and force operations from agent sessions.
3. Create the GitHub repository, add the remote, push `main`, enable branch protection (PRs required, CI must pass).
4. Add `.github/workflows/ci.yml`: install, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Add the Playwright job from Phase 2.
5. Import the repository in Vercel; every pull request now gets a preview deployment.

## 9. Verify the foundation

Phase 0 is only done when all of these pass:

- [ ] `npm run dev` serves a branded home shell at http://localhost:3000 in light and dark mode
- [ ] `GET /api/health` returns `{ "ok": true }` and confirms the database connection
- [ ] `npm run check` passes with at least one real test
- [ ] A commit triggers the pre-commit hook
- [ ] A pull request produces a green CI run and a Vercel preview URL
- [ ] `npx prisma db seed` loads the seed data and Prisma Studio shows it

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm.ps1 cannot be loaded` | Run the `Set-ExecutionPolicy` line in section 1, or use Git Bash |
| `EPERM` or locked files in `.next` | Stop the dev server and antivirus scan on the project folder; delete `.next` |
| `create-next-app` says the directory is not empty | Scaffold into `sariwa-scaffold` as shown, do not scaffold in place |
| Port 3000 in use | `npx kill-port 3000` or `npm run dev -- -p 3001` |
| Prisma cannot connect | Use `sslmode=require`; use `DIRECT_URL` for migrations and the pooled URL for the app |
| CRLF warnings from Git | Section 1 `core.autocrlf input`; add `.gitattributes` with `* text=auto eol=lf` |
| Long paths error on `npm install` | `git config --system core.longpaths true` and enable Windows long paths |
