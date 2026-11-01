---
status: accepted
---

# Filipino, the installable app and the shopping funnel

Batch 5.5 closes Phase 5 (PRD: Filipino language, PWA install, analytics; principle 6 "light on data"). The owner chose on 2026-10-22: the main shopping pages in Filipino first, an installable app with offline basics, and our own privacy-first funnel. The rest are defaults Claude chose; the owner may revise them.

## Decision

1. **Filipino pages live at `/fil/...`; English keeps today's addresses.** Every public page sits under `app/[lang]` (`en` or `fil`) with the root layout there, so each language is prerendered and cached on its own and `<html lang>` is right for screen readers and search engines. A proxy maps an address without a language to `/en` internally and sends `/en/...` to the address without it. Staff screens (`/admin`) have their own root layout and stay English.
2. **Translated now**: the shop's shell (header, menus, footer, Cart drawer) and the main shopping pages (Home, Categories, search, Product pages, Cart, Checkout and the Order pages). Account, Recipes, Articles, lists, claims and messages stay English for now. Product, Category and Recipe names are data and stay as staff enter them.
3. **Words come from two dictionaries** (`en`, `fil`) with the same keys, checked by TypeScript. Server components read the language with `next/root-params`; client components get the words from a provider. The Filipino is Claude's draft in everyday Taglish and must be checked by a native speaker before launch.
4. **A switch in the header and footer** moves between the same page in English and Filipino. Search engines are told about both versions (`hreflang`).
5. **Installable app**: a web manifest with the Hoshimono icon, opening full screen; Android shows an "Install the app" button when the browser offers it. A small service worker keeps the pages and pictures already viewed, so they still open on a weak or no connection, with an offline page and a clear note; placing an Order, payments and staff screens always need the network and are never cached.
6. **The funnel counts steps, not people**: Product pages viewed, items added to Carts, Checkouts started and Orders placed, per Manila day, in one small table of counts. No identifier, no cookie, no third party, so no consent banner. The admin report shows the steps and the share that went on to the next.

## Consequences

- Public route folders move under `src/app/[lang]`; imports of their actions change path, and route types gain `[lang]`. Unknown addresses fall through to a catch-all that shows the not-found page in the right language.
- Server Actions keep working at either address; Checkout carries the language so the confirmation page matches.
- Server Actions cannot read the language (`next/root-params` refuses), so Cart actions, Slot holds and Voucher refusals now answer with reason codes ([ADR 0009](0009-module-results-and-errors.md)) and the page words them. `VOUCHER_REFUSAL` left the pricing module for the dictionaries.
- The address form (shared with the account pages) stays English on the Filipino Checkout for now. The installed app opens the English Home.
- Playwright blocks the service worker except in the offline test: it loses track of requests the worker passes through, so pages never reach "network idle" for it. Browsers are not affected.
- Not now: Filipino for the remaining pages and messages, push notifications, background sync of the Cart, Vercel Analytics (when hosting exists), per-visitor journeys.
