# Concept: native mobile app in Flutter

> **Frozen concept, 2026-10-17.** Kept for a possible future build. Nothing here is scheduled; the MVP and V1 ship as the web app plus an installable PWA ([07-ROADMAP.md](../../07-ROADMAP.md)). Do not build from this plan without reviewing it first: Flutter, its packages and our own API will have moved on.

## Decision so far

- **Not now.** The web app and PWA come first, as planned in [03-ARCHITECTURE.md](../../03-ARCHITECTURE.md) section 15.
- **If a native app is built, it will be Flutter (Dart)**: one code base for Android and iPhone, written by the same small team.
- **No API work happens in advance.** The modular monolith already keeps business logic behind module interfaces (`modules/*/index.ts`), so a JSON API can be added when the app starts, without rewriting the core.

## When to reconsider

Start this only when at least one is true:

1. A clear share of Customers asks for a store app, or PWA install rates stay low.
2. Push notifications on iPhone through the PWA prove unreliable for order updates.
3. Aggregator channels or partners require an app store presence.

## What building it would involve

| Area | Work |
|---|---|
| **API** | Add a versioned JSON API (`/api/v1/...`) as Next.js route handlers that call the existing module interfaces. Same Zod schemas, same server-side pricing and stock checks. Clients never send trusted totals. |
| **Sign-in** | Token-based sessions for the app (the web keeps HTTP-only cookies). Confirm what Better Auth supports for mobile clients at the time; OTP, magic link and Google must all work. |
| **Screens** | Customer screens only: Home, Category, Search, Product, Cart, Checkout, Orders, Account. Admin, Picker and Dispatch stay on the web. |
| **Design** | Port the v2 tokens from [05-DESIGN-SYSTEM.md](../../05-DESIGN-SYSTEM.md) into a Flutter theme: same colours, Epilogue and Plus Jakarta Sans, Phosphor icons, 44 px targets, light and dark. |
| **Money** | Integer centavos (`int`) end to end, formatted only for display ([ADR 0002](../../adr/0002-money-as-integer-centavos.md)). |
| **Payments** | Hand off to the provider's hosted checkout or SDK; confirm GCash and card flows for mobile with Xendit or PayMongo. Webhooks stay the source of truth. |
| **Notifications** | Push for order status through Firebase Cloud Messaging (Android) and Apple Push Notification service (iPhone). |
| **Links** | Deep links that match the web URLs (`/p/<slug>-<id>`), so shared links open the app when installed. |
| **Testing** | Flutter widget and integration tests, plus the existing Playwright tests for the web. |
| **Releases** | Google Play and Apple App Store accounts, store listings, privacy labels, review time on every release. |

## Practical constraints

- **iPhone builds need macOS.** The current dev machine is Windows, so it can build and test Android only. Use a Mac or a cloud build service for iOS.
- **Accounts and fees:** a Google Play developer account (one-time fee) and an Apple Developer Program membership (yearly fee). Check current prices when starting.
- **Not installed today:** the Flutter SDK, Dart, Android Studio or the Android SDK, and Java. Install them only when the build starts.
- **Rough effort:** 6 to 10 weeks for one developer for the customer app, after the API exists. Treat this as a guess to re-estimate.

## Trade-offs

| Gains | Costs |
|---|---|
| App store presence and trust | Every customer screen and feature built twice (web and app) |
| Reliable push notifications, smoother feel, better offline cart | Store review delays every release; web updates are instant |
| Easier camera use for Freshness Claims | Second codebase for a team of 1 to 3 |
