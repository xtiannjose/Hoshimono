# Research: BuiltaMart teardown

Date: 2026-10-16. Purpose: understand a working Philippine e-grocer so Sariwa can borrow what works and improve what does not. We take ideas and structure only; we do not copy their name, branding, copy, photography or code.

## How this was gathered, and its limits

| Source | What it gave |
|---|---|
| Raw HTML of `https://builtamart.com` | Tech stack, metadata, integrations |
| `sitemap.xml`, `sitemap-0.xml`, `server-sitemap.xml` | Full page inventory and URL patterns |
| App Store listing (BuiltaMart: Grocery Delivery) | Range size, fees, payment methods, app features |
| Press coverage of their seed round (The Independent Investor PH) | Operating model, fulfilment, channels, plans |

**Limit:** the storefront is rendered in the browser, so server-fetched HTML contains only the page shell. The visual layout, navigation labels, product card design and checkout steps were **not observed**. Treat section 5 as the gap list. To close it, open the site in Chrome and capture screenshots (the `claude-in-chrome` skill can do this on request), or have someone place a test order.

## 1. What BuiltaMart is

- A Metro Manila online grocery positioned as "your everyday premium online grocery", with instant or same-day delivery. Hubs are listed for New Manila, Pasig and Mandaluyong.
- Founded around 2020 and based in Quezon City. Raised a reported USD 3 million seed round in 2024 to add hubs and invest in technology.
- Operates from a single non-public fulfilment hub of about 300 square metres handling roughly 200 to 300 orders a day, with temperature-controlled rooms for fruit, vegetables and frozen goods. Pickers fill orders from the hub; riders collect completed orders at a releasing area.
- Sells through its own website and app plus aggregators (GrabMart, Lazada, Pick-a-Roo).
- Deliberately trades speed for selection and quality: delivery can take longer than an hour so pickers can choose properly.

## 2. Customer-facing offer

| Topic | What we saw |
|---|---|
| Range | 6,000+ products: fresh produce, meat, dairy, frozen, pantry, specialty, household |
| Delivery | Home or office; flat PHP 59 fee per order; Metro Manila and select areas |
| Payment | GCash, credit card, cash on delivery |
| Quality | "Every order checked for freshness before delivery" |
| App | iOS app with order tracking, deep links from web, and a Tax & Business Compliance page showing registration details |
| Trust | "Trusted by 100,000 Filipino shoppers" on the app listing |

## 3. Site map (from sitemaps)

```
/                       home
/home
/search
/login   /register   /profile
/products/{slug}-{id}   product detail (thousands, via server sitemap)
/recipes                recipes index
/recipes/category/search
/blogs                  articles (includes a referral rewards program post)
/contact-us
/policies/privacy-policy  /refund-policy  /terms-of-service
/rss.xml                product RSS feed
```

Product slugs combine category prefix, name, size, brand and a numeric id (for example `frozen-prime-beef-sukiyaki-cut-300g-by-chingolo-14123`). This is SEO-friendly and stable; we adopt a similar pattern.

## 4. Technical observations

| Area | Observation | Our take |
|---|---|---|
| Framework | Next.js (page metadata carries `next-head-count`) | Same family; we use the App Router with server rendering |
| Payments | Xendit browser script loaded on every page | Xendit is a proven PH option; we keep the provider swappable ([ADR 0003](adr/0003-payment-provider-interface.md)) |
| Analytics | Google Analytics, Facebook Pixel | Include GA and consented pixels; load after consent |
| Sitemaps | Separate static, product and recipe sitemaps | Same split |
| Feeds | Product RSS feed | Low priority; a product feed for Google Merchant Center matters more |
| Deep links | Apple app-site-association and Android assetlinks files | Needed only if we ship native apps; PWA first |
| Page shell | Fixed viewport, no zoom (`maximum-scale=1`) | We allow zoom for accessibility |

## 5. Where Sariwa matches, differs and must still learn

| Capability | BuiltaMart | Sariwa MVP | Sariwa V1 |
|---|---|---|---|
| Large range with brand/size in URL | Yes | Yes | Yes |
| Flat delivery fee | PHP 59 | Configurable, default PHP 59 | Same |
| GCash, card, COD | Yes | COD first, then GCash and card | Same |
| Recipes | Section exists | None | One-tap recipe to cart with servings scaling |
| Referral rewards | Blog post and program | None | Referral ledger |
| Substitution handling | Not observed | Per-line preference | Smart suggestions |
| Weighed item pricing | Not observed | Estimate plus final weight | Same |
| Delivery slot visibility | "Instant" / same-day | Real slots with capacity | Same |
| Native app | Yes (iOS, likely Android) | PWA | Evaluate |
| Aggregator channels | GrabMart, Lazada, Pick-a-Roo | No | Evaluate after traction |
| Nav, filters, product card, checkout UX | **Not observed** | Designed in [mockup](mockup/README.md) | Validate against real screenshots |

## 6. Lessons applied to the plan

1. **Hub, not store.** Size the system around a non-public Hub with a Picker workflow. Stock, Slots and Zones all hang off the Hub from day one so a second Hub is configuration, not a rewrite.
2. **Quality is the brand.** Freshness checks and honest Substitutions matter more than speed. The Picker view and Freshness Claim flow are core, not extras.
3. **Compliance page builds trust.** Ship a business and tax information page at launch.
4. **Content drives repeat purchase.** Recipes and a referral program are in the reference site; they are our V1 differentiators, done better.
5. **Multiple channels later.** Keep Orders and stock channel-agnostic (`Order.channel`) so aggregator orders can be ingested without a schema change.
