---
status: accepted
---

# One Next.js app organised as a modular monolith

Storefront, admin, API routes, webhooks and cron endpoints live in a single Next.js deployable. Business logic sits in `src/modules/*` with enforced public interfaces. The team is one to three developers; one repo, one deploy and one database keep delivery fast and operations simple.

## Considered options

- **Separate backend (NestJS or similar) plus Next.js frontend.** Rejected: doubles deployment, auth and typing work for no current benefit.
- **Microservices.** Rejected: no scaling or team-ownership problem exists yet.
- **Headless commerce platform (Medusa, Saleor, Shopify).** Rejected for now: our core differences (Hub-based stock, Slot capacity, weighed items, Philippine payment methods, Picker workflow) mean we would bend the platform more than use it. Revisit if the custom commerce core grows beyond what two developers can maintain.

## Consequences

- Module boundaries are a convention, so they are enforced with an ESLint import restriction and reviewed in PRs. Without enforcement this decision degrades into a big ball of mud.
- A module can later be extracted into a service because it already owns its tables and exposes a narrow interface.
- Long-running or bursty work goes through the `jobs` table and cron, not request handlers, because the host is serverless-friendly.
