# Product Requirements: Hoshimono

Status: draft v0.1, 2026-10-16. Owner: project lead. Update this document before changing scope.

## 1. Summary

Hoshimono is an online supermarket. Customers browse a full grocery range, build a cart, choose a delivery slot and pay online or in cash. Orders are picked at a Hoshimono-run Hub and delivered the same day by Riders.

**Goals**

1. A customer can place a grocery order in under four minutes on a mid-range phone over a mediocre connection.
2. The Hub can pick, hand off and deliver 200 Orders a day with one Picker shift lead and no spreadsheets.
3. The owner can add and price Products, set delivery rules and see the day's Orders without a developer.

**Non-goals for the first release**: marketplace of third-party sellers, native mobile apps, alcohol or prescription items, scheduled subscriptions, multi-currency.

## 2. Assumptions

Change a row here and every other document should follow. Anything marked "confirm" needs a decision before Phase 2.

| Topic | Assumption | Status |
|---|---|---|
| Market | Metro Manila, Philippines | confirm |
| Locale | `en-PH`, Filipino copy later (Phase 5) | confirm |
| Currency | PHP, prices include VAT, shown as `PHP 1,249.00` or `P1,249` in compact UI | confirm |
| Fulfilment | One Hub at launch, designed for many | confirm |
| Delivery fee | Flat per Order, default PHP 59, free above a configurable threshold | confirm |
| Minimum order | Configurable per Zone, default PHP 500 | confirm |
| Payments at launch | Cash on delivery first, then GCash and cards | confirm |
| Range at launch | 2,000 to 5,000 Products imported from supplier price lists | confirm |
| Brand name | "Hoshimono" (replaced the working name "Sariwa") | confirmed 2026-10-17 |

## 3. Personas

**Marites, 38, household buyer (primary).** Works hybrid in Pasig, orders weekly for a family of four, cares about fresh produce, hates surprise substitutions, pays by GCash. Orders on her phone during lunch.

**Paolo, 29, condo dweller.** Orders small, frequent baskets (milk, eggs, ready-to-cook). Wants delivery inside an hour and a clear running total. Pays by card.

**Ate Nida, 52, office pantry buyer.** Orders in bulk for a small office on Fridays. Needs reorder, invoices and cash on delivery.

**Jun, Hub Picker.** Works on a handheld or phone, wants the pick list in aisle order with substitutions pre-decided by the customer.

**Rhea, owner / merchandiser.** Sets prices, imports supplier lists, creates promotions, and watches the day's Orders. Non-technical.

## 4. Scope by release

| Release | Contents |
|---|---|
| **MVP (Phases 0 to 4)** | Catalogue browse and search, Cart, Checkout with Slots, COD and online payment, Orders, accounts, admin for Products/Orders/Zones/Slots, Picker view, Rider handoff, email and SMS notices |
| **V1 (Phase 5)** | Recipes with one-tap add-to-cart, Reorder and saved lists, Referral rewards, Promotions and Vouchers, Freshness Claims, PWA install, Filipino language |
| **Later** | Multiple Hubs with per-Hub stock, aggregator channel sync, loyalty tiers, native app in Flutter (plan frozen in [concepts/flutter-mobile](concepts/flutter-mobile/README.md)), scheduled repeat orders, AI-assisted substitutions |

## 5. Functional requirements

Priority: **M** must (MVP), **S** should (V1), **C** could (later). IDs are stable; use them in commits and tests.

### 5.1 Browse and discover

| ID | Requirement | Pri |
|---|---|---|
| CAT-1 | Home page shows delivery coverage, featured categories, Promotions and a "Buy again" rail for signed-in Customers | M |
| CAT-2 | Category pages list Products with filters (brand, price range, dietary tags) and sort (relevance, price, Unit Price) | M |
| CAT-3 | Search with typo tolerance, brand and category suggestions, and zero-result guidance | M |
| CAT-4 | Product page shows images, price, Unit Price, pack size, description, ingredients/allergens, storage, stock state and related Products | M |
| CAT-5 | Out-of-stock Products stay visible, marked, with "Notify me" or suggested alternatives | S |
| CAT-6 | Every Product and Category has a stable, readable URL with structured data for search engines | M |
| CAT-7 | Recipe pages list ingredients mapped to Products and add them to the Cart in one action, scaling by servings | S |

### 5.2 Cart and checkout

| ID | Requirement | Pri |
|---|---|---|
| CRT-1 | Cart works for guests, persists across sessions and merges into the account on sign-in | M |
| CRT-2 | Quantity stepper on every Product card and in the Cart, with instant optimistic update and server reconciliation | M |
| CRT-3 | Each Cart Line carries a Substitution Preference (allow, choose, none) with a sensible default | M |
| CRT-4 | Weighed Products show "approx. weight" and a clear note that the final charge follows the weighed amount | M |
| CRT-5 | Cart shows subtotal, delivery fee, Voucher discount and a running total, and flags items whose price or stock changed | M |
| CHK-1 | Checkout collects Address (with landmark and rider notes), Slot, contact number and payment method on one page | M |
| CHK-2 | Only Slots with remaining capacity at the Address's Hub are offered; a chosen Slot is held for 10 minutes | M |
| CHK-3 | Cash on delivery, GCash and card payment; payment failure returns the Customer to Checkout with the Cart intact | M |
| CHK-4 | Order confirmation page and email/SMS with order number and tracking link | M |
| CHK-5 | Minimum order value and Zone coverage are validated on the server and explained in plain language | M |

### 5.3 Accounts and orders

| ID | Requirement | Pri |
|---|---|---|
| ACC-1 | Sign up and sign in with mobile number OTP, email magic link or Google | M |
| ACC-2 | Saved Addresses with default and per-address delivery notes | M |
| ACC-3 | Order history with status timeline, receipt, and Reorder | M |
| ACC-4 | Order tracking: placed, confirmed, picking, out for delivery, delivered, with Rider name and number once dispatched | M |
| ACC-5 | Cancel an Order free of charge until picking starts | M |
| ACC-6 | Freshness Claim from an Order Line within 24 hours of delivery, with photo upload; refund or store credit | S |
| ACC-7 | Referral code, rewards ledger and invite sharing | S |

### 5.4 Admin and operations

| ID | Requirement | Pri |
|---|---|---|
| ADM-1 | Product create/edit with images, pricing, tax, tags, status; CSV import and export | M |
| ADM-2 | Category tree management and Product-to-Category assignment | M |
| ADM-3 | Stock per Product per Hub, manual adjust with reason, low-stock list | M |
| ADM-4 | Zone and delivery fee management; Slot templates with capacity per day | M |
| ADM-5 | Order queue with filters, status changes, notes, partial refunds | M |
| ADM-6 | Picker view: pick list sorted by Hub aisle, tick-off, mark short, propose Substitution, enter final weight | M |
| ADM-7 | Dispatch view: assign Rider, mark out for delivery and delivered, capture proof of delivery | M |
| ADM-8 | Promotion and Voucher management with eligibility and usage caps | S |
| ADM-9 | Recipe and article editor | S |
| ADM-10 | Daily report: orders, revenue, average basket, substitution rate, late deliveries | S |
| ADM-11 | Staff roles: Admin, Merchandiser, Picker, Dispatcher with least-privilege access | M |

## 6. What makes Hoshimono different

Chosen because each is visible to a customer, cheap to build on our stack, and absent or unclear in the reference site (see [02-RESEARCH-BUILTAMART.md](02-RESEARCH-BUILTAMART.md)).

1. **Substitution control per line.** The Customer decides, in advance, what happens if a Product is missing. Fewer unhappy deliveries and fewer support calls.
2. **Weighed-item honesty.** The Customer is charged the actual weight (card hold of estimate plus 10%, or estimate then refund for wallets) and sees both figures. No surprises, no overcharging.
3. **Recipe to cart.** One tap fills the Cart with every ingredient, scaled by servings, skipping what the Customer marks as already at home.
4. **Unit Price everywhere.** Compare a 400 g and a 1 kg pack at a glance.
5. **Live Slot capacity.** The Customer sees real windows, not a vague "same day".
6. **Light on data.** Mobile-first, image-optimised, installable PWA; cart and browse stay usable on weak connections.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Largest Contentful Paint under 2.5 s and Interaction to Next Paint under 200 ms on a mid-range Android over 4G for Home, Category and Product pages |
| Accessibility | WCAG 2.2 AA; full keyboard use; visible focus; 44 px touch targets; respects reduced motion |
| Security | OWASP ASVS L1 baseline; server-side price and stock validation; rate limiting on OTP and login; webhook signature verification; no card data touches our servers |
| Privacy | Comply with the Philippine Data Privacy Act of 2012; consent for marketing messages; data export and delete on request; privacy policy and terms published before launch |
| Compliance | Receipts and tax details meet BIR requirements for the registered business; confirm with an accountant before launch |
| Reliability | Checkout and payment webhooks must never double-charge or lose an Order; target 99.5% monthly availability |
| SEO | Server-rendered catalogue pages, sitemaps, canonical URLs, Product structured data |
| Observability | Error tracking, structured logs with order ids, payment event audit trail, uptime check on checkout |
| Browser support | Last two versions of Chrome, Safari, Edge, Samsung Internet; Android 9+ and iOS 15+ |

## 8. Success metrics

Targets are starting hypotheses to be re-baselined after four weeks of real traffic.

| Metric | Starting target |
|---|---|
| Checkout completion (cart to paid or confirmed COD) | 55% or better of sessions that reach Checkout |
| Median time from first add-to-cart to placed Order | Under 4 minutes |
| Item fill rate (ordered lines delivered as ordered or accepted Substitution) | 95% or better |
| On-time delivery within chosen Slot | 90% or better |
| Freshness Claims per 100 Orders | Under 3 |
| Repeat purchase within 30 days | 40% or better |

## 9. Risks and open questions

| Risk or question | Mitigation or next step |
|---|---|
| Product data: images, descriptions, barcodes for thousands of SKUs | Start from supplier price lists; build CSV import in Phase 1; budget time for photography |
| Cold chain and freshness cannot be solved by software | Hub process doc and Picker checklist; Freshness Claim flow in V1 |
| Payment provider approval takes weeks | Start the business verification in Phase 0, launch COD first |
| Address quality (informal addresses) | Mandatory landmark field, map pin, Rider call button |
| Legal and tax setup | Accountant sign-off before public launch |
| Which supplier(s) and what margin? | Business decision outside this repo; needed before Phase 1 data load |
| Do we sell through aggregators (Grab, Lazada)? | Later; architecture keeps stock and orders channel-agnostic |
