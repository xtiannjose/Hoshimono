# Tooling: skills, plugins and libraries

This is the map from "I need to do X" to "use Y". It reflects what is installed on the dev machine on 2026-10-17. Skills are invoked in Claude Code by name (for example `/tdd`), or Claude picks them up when the task matches.

## 1. Claude Code skills

| Skill                                                                                                                | Use it when                                                                                                                                                                         | Phases     |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `design-taste-frontend`                                                                                              | Building any storefront page or section; run **before** writing UI code. Enforces the anti-slop rules and the pre-flight check                                                      | 0, 1, 2, 5 |
| `ui-ux-pro-max` (global)                                                                                             | UX and accessibility checklists, chart picks, stack-specific UI guidance. Its palette and font suggestions never override [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md)                | 1, 2, 5    |
| `design`, `design-system`, `brand`, `banner-design`, `slides`, `ui-styling` (global, installed with `ui-ux-pro-max`) | Marketing assets, banners and decks only; follow the v2 tokens. Some use Gemini image generation, which needs a key                                                                 | 5, 6       |
| `apple-design`                                                                                                       | Gesture and spring behaviour: cart drawer, bottom sheets, steppers, drag-to-dismiss                                                                                                 | 2, 4       |
| `motion` and the `motion` MCP docs                                                                                   | Any animation; search docs first, audit finished work with MotionScore                                                                                                              | 1, 2, 5    |
| `tdd`                                                                                                                | Pricing, cart, inventory, orders, payments, webhooks. Red, green, refactor                                                                                                          | 0 to 4     |
| `domain-modeling`                                                                                                    | A new domain word appears or a hard-to-reverse choice is made; updates `GLOSSARY.md` and `docs/adr/`                                                                                | all        |
| `codebase-design`                                                                                                    | Shaping a module's public interface; deciding where a boundary goes                                                                                                                 | 0 to 4     |
| `grilling`                                                                                                           | Stress-testing a plan or decision before committing (payments design, Slot model, launch plan)                                                                                      | all        |
| `prototype`                                                                                                          | A throwaway UI or state experiment (for example three cart layouts) before building the real one                                                                                    | 1, 2       |
| `research`                                                                                                           | Reading vendor docs (Xendit, PayMongo, Semaphore) and capturing findings in the repo                                                                                                | 0, 3       |
| `diagnosing-bugs`                                                                                                    | Anything broken, flaky or slow; builds a reproduction loop first                                                                                                                    | all        |
| `run`                                                                                                                | Launch the app and confirm a change works in the real thing                                                                                                                         | all        |
| `playwright-cli` (project skill in `.claude/skills/`)                                                                | Agent-driven browser checks: screenshots at 1440 and 390 px, light and dark, interaction scripts, axe-core runs. Serve files over `http://127.0.0.1` because it blocks `file:` URLs | all        |
| `anthropic-skills:chrome-browser` (Claude in Chrome)                                                                 | Browsing in your own signed-in Chrome: finish the BuiltaMart UI teardown, check live sites                                                                                          | 0, 6       |
| `setup-pre-commit`                                                                                                   | One-time Husky, lint-staged, Prettier, type check, test hook                                                                                                                        | 0          |
| `git-guardrails-claude-code`                                                                                         | One-time block of destructive git commands in agent sessions                                                                                                                        | 0          |
| `code-review`                                                                                                        | Review a branch or PR for standards and spec compliance                                                                                                                             | each PR    |
| `security-review`                                                                                                    | Review pending changes for vulnerabilities; mandatory before payment and launch                                                                                                     | 3, 6       |
| `simplify`                                                                                                           | Clean up changed code for reuse and clarity                                                                                                                                         | each PR    |
| `pr`                                                                                                                 | Write pull request bodies                                                                                                                                                           | each PR    |
| `claude-api`                                                                                                         | If we add AI features (substitution suggestions, recipe search, support chat) use current Claude model IDs                                                                          | 5+         |
| `dataviz`                                                                                                            | Admin charts and daily report                                                                                                                                                       | 4, 5       |
| `artifact-design` and Artifact tool                                                                                  | Publishing mockups, status pages and review boards                                                                                                                                  | all        |
| `schedule`, `loop`                                                                                                   | Recurring checks: weekly dependency audit, nightly stock sanity, CI babysitting                                                                                                     | 4+         |
| `update-config`, `fewer-permission-prompts`                                                                          | Tune Claude Code permissions and hooks for this repo                                                                                                                                | 0          |
| `claude-automation-recommender`                                                                                      | Ask for hook, subagent and MCP suggestions once code exists                                                                                                                         | 0          |
| `anthropic-skills:xlsx`                                                                                              | Build supplier price-list templates and clean messy CSV imports                                                                                                                     | 1          |
| `anthropic-skills:pdf` and `docx`                                                                                    | Receipts, pick sheets, legal documents                                                                                                                                              | 4, 6       |

Token-saving helpers (optional): `caveman` mode for terse replies, `ponytail` for the smallest sufficient change, `caveman:cavecrew-*` subagents for locating code, small edits and diff review.

## 2. Subagents

| Agent                           | Use                                                         |
| ------------------------------- | ----------------------------------------------------------- |
| `Plan`                          | Design an implementation approach for a phase before coding |
| `Explore`                       | Broad search across the repo once it has code               |
| `caveman:cavecrew-investigator` | "Where is X defined / who calls Y" lookups                  |
| `caveman:cavecrew-builder`      | Bounded one or two file edits                               |
| `caveman:cavecrew-reviewer`     | Fast diff review                                            |
| `motion-reviewer`               | Audit animation performance across the project              |
| `general-purpose`               | Multi-step research or work that does not fit the others    |

## 3. MCP servers

| Server                                        | Use                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `motion` (`https://mcp.motion.dev`)           | Search Motion documentation and examples before writing animation code                                      |
| `motion-plus` (`https://mcp.motion.dev/plus`) | MotionScore audits and CSS springs; needs a Motion+ sign-in via `/mcp`, and `motion-reviewer` depends on it |
| `claude.ai Claude Docs`                       | Shareable living documents (for example a stakeholder-friendly version of the PRD)                          |

Candidates to add when a phase needs them: a Postgres/Neon MCP (inspect schema and run read-only queries), GitHub MCP (PRs and issues), Playwright MCP (browser tests), Sentry MCP (read errors). Add only when the manual workflow hurts.

## 4. Libraries

| Concern                        | Library                                                                                        | Notes                                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework                      | Next.js (App Router), React, TypeScript                                                        | Server Components by default                                                                                                                                                                           |
| Styling                        | Tailwind CSS v4, shadcn/ui (customised)                                                        | Tokens in [05-DESIGN-SYSTEM.md](05-DESIGN-SYSTEM.md)                                                                                                                                                   |
| Animation                      | Motion (`motion/react`)                                                                        | Leaf client components only                                                                                                                                                                            |
| Animated components (optional) | React Bits, copied in through the shadcn registry (`npx shadcn@latest add @react-bits/<Name>`) | Sparingly, on the Home hero and Recipe pages only. MIT + Commons Clause allows use in our app but not reselling the components. Check each component's dependencies and reduced-motion behaviour first |
| Fonts                          | Epilogue, Plus Jakarta Sans, Geist Mono via `next/font`                                        | `latin` + `latin-ext` for the peso sign                                                                                                                                                                |
| Icons                          | `@phosphor-icons/react`                                                                        | One family                                                                                                                                                                                             |
| Forms and validation           | React Hook Form, Zod                                                                           | Same Zod schemas on client and server                                                                                                                                                                  |
| Data                           | PostgreSQL, Prisma                                                                             | Raw SQL via `$executeRaw` for guarded atomic updates                                                                                                                                                   |
| Auth                           | Better Auth                                                                                    | Verify current setup docs at install time                                                                                                                                                              |
| Tables (admin)                 | TanStack Table                                                                                 | Dense admin views                                                                                                                                                                                      |
| Email                          | Resend + React Email                                                                           | Templates as components                                                                                                                                                                                |
| SMS                            | Semaphore (PH) or Twilio                                                                       | Behind `notifications`                                                                                                                                                                                 |
| Payments                       | Xendit or PayMongo SDK                                                                         | Behind `PaymentProvider`                                                                                                                                                                               |
| Testing                        | Vitest, Testing Library, Playwright, axe-core                                                  | Real database for integration tests                                                                                                                                                                    |
| Quality                        | ESLint, Prettier, Husky, lint-staged                                                           | Set up via `setup-pre-commit`                                                                                                                                                                          |
| Monitoring                     | Sentry, uptime monitor, Vercel analytics                                                       |                                                                                                                                                                                                        |
| i18n (Phase 5)                 | `next-intl`                                                                                    | English first, Filipino later                                                                                                                                                                          |

## 5. Machine facts (checked 2026-10-19)

Windows 11 Home, Node v24.18.0, npm 11.16.0, Git 2.55, Python 3.12.10, uv 0.11.32, Docker 29.8.2 (runs the `hoshimono-db` container). Global npm tools to install: `@playwright/cli` (`playwright-cli`), `ui-ux-pro-max-cli` (`uipro`). pnpm, Flutter, Dart, the Android SDK and Java are not installed; the project uses npm.

## 6. References and concepts

| Where                                                                                                     | What                                                         | Rule                                                                               |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `C:\Users\cjose\Documents\Projects\references\awesome-design-md` (clone of `VoltAgent/awesome-design-md`) | DESIGN.md files extracted from real brands (MIT)             | Inspiration and structure only; never copy a brand's look into the app             |
| [concepts/](concepts/)                                                                                    | Frozen design directions v3, v4, v5 and the Flutter app plan | Read only; protected by a deny rule in `.claude/settings.json` and read-only files |

## 7. Prompts that work

Starting a phase:

> "Read CLAUDE.md and docs/07-ROADMAP.md. We are on Phase 1. Plan the `catalog` module interface with the `codebase-design` skill, then build `getProduct` and `listProducts` test-first with `tdd`."

Building UI:

> "Run `design-taste-frontend`, read docs/05-DESIGN-SYSTEM.md and the mockup, then build the `ProductCard` with all states and the add-to-stepper motion."

Making a decision:

> "Use `grilling` on how we handle GCash payments for weighed items, then record the outcome as an ADR with `domain-modeling`."
