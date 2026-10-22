# Data Model

Status: v0.2, 2026-10-17. `prisma/schema.prisma` is now the source of truth for tables and fields; this document keeps the reasoning and invariants. Terms follow [GLOSSARY.md](../GLOSSARY.md).

**Schema v0 (Batch 0.3)** covers the MVP tables (Phases 0 to 4). Recipes and Articles came with Batch 5.1 (migration `recipes_articles`); Promotions, Vouchers and Referrals with Batch 5.3 (`promotions_vouchers`); Freshness Claims with Batch 5.4 (`freshness_claims`). Differences from the field lists below:

- `carts.checked_out_at` marks a Cart that became an Order. "Active Cart" (invariant 9) means `checked_out_at IS NULL`.
- Append-only tables (`stock_movements`, `order_status_events`, `payment_events`, `audit_log`) have `created_at` (or `at`, `received_at`) but no `updated_at`.
- `payments.provider` is null for cash on delivery.
- `products.search_vector` is a generated column: `simple` text search over `immutable_unaccent()` of name (weight A), brand (B) and description (C). Catalogue search (Batch 1.1) may change the expression in a new migration.
- Invariants 1, 2, 3, 4, 5, 8 and 9 are database constraints in the first migration and are covered by `tests/db/invariants.test.ts`. Invariants 6 and 7 are enforced in code (`orders` module, Phase 2).

## 1. Conventions

- Primary keys: UUID (v7 where available) as `String @id`. Human-facing Order numbers are separate (`SW-YYMMDD-XXXX`).
- Every table: `created_at`, `updated_at` (UTC). Database names are `snake_case` via `@map`.
- **Money:** integer centavos in `*_cents` columns. Never `Float` or `Decimal` ([ADR 0002](adr/0002-money-as-integer-centavos.md)).
- **Quantities:** pieces are integers; weights are integer grams (`*_grams`).
- **Soft delete only for Product** (`archived_at`). Everything else is deleted for real or kept as history.
- **Snapshots over joins** for anything a receipt must reproduce: Order Lines copy name, price, tax class and VAT.
- Enumerations as Postgres enums for closed sets (order status), lookup tables for open sets (tags).

## 2. Entity relationship overview

```mermaid
erDiagram
    CUSTOMER ||--o{ ADDRESS : saves
    CUSTOMER ||--o{ CART : owns
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ REFERRAL : "refers"
    HUB ||--o{ ZONE : serves
    HUB ||--o{ SLOT : offers
    HUB ||--o{ STOCK_LEVEL : holds
    ZONE ||--o{ ADDRESS : covers
    CATEGORY ||--o{ CATEGORY : "parent of"
    CATEGORY ||--o{ PRODUCT : groups
    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT ||--o{ STOCK_LEVEL : "stocked as"
    PRODUCT ||--o{ CART_LINE : "added as"
    PRODUCT ||--o{ ORDER_LINE : "sold as"
    PRODUCT ||--o{ RECIPE_INGREDIENT : "used in"
    RECIPE ||--o{ RECIPE_INGREDIENT : lists
    CART ||--o{ CART_LINE : contains
    ORDER ||--o{ ORDER_LINE : contains
    ORDER ||--o{ PAYMENT : "paid by"
    ORDER ||--o{ ORDER_STATUS_EVENT : "history"
    ORDER }o--|| SLOT : "delivered in"
    ORDER }o--|| HUB : "fulfilled by"
    ORDER_LINE ||--o{ SUBSTITUTION : "may have"
    ORDER_LINE ||--o{ FRESHNESS_CLAIM : "may be claimed"
    PAYMENT ||--o{ PAYMENT_EVENT : records
    VOUCHER ||--o{ ORDER : "applied to"
    STAFF ||--o{ ORDER_STATUS_EVENT : performs
    STAFF ||--o{ AUDIT_LOG : writes
```

## 3. Core tables

Only fields that carry meaning are listed. Standard columns are omitted.

### catalog

**`products`**: `id`, `slug`, `name`, `brand`, `description`, `category_id`, `pack_size_value`, `pack_size_unit` (`g`, `ml`, `pc`), `unit_price_basis` (per 100 g, per litre, per piece), `price_cents`, `compare_at_cents` (nullable, for strikethrough), `tax_class` (`vatable`, `vat_exempt`, `zero_rated`), `is_weighed`, `avg_unit_weight_grams` (for weighed items sold per piece), `barcode`, `allergens[]`, `dietary_tags[]`, `storage` (`ambient`, `chilled`, `frozen`), `status` (`draft`, `active`, `archived`), `search_vector`.
Unique: `slug`, `barcode` (where present). Index: `category_id`, `status`, GIN on `search_vector`, trigram on `name`.

**`categories`**: `id`, `parent_id`, `slug`, `name`, `sort_order`, `image_url`, `search_words?` (words its Products also answer to in search, such as "meat" on Pork). Tree depth is capped at 3.

**`product_images`**: `product_id`, `url`, `alt`, `sort_order`, `is_primary` (one primary per Product, enforced by partial unique index).

### delivery

**`hubs`**: `id`, `name`, `address`, `lat`, `lng`, `is_active`.

**`zones`**: `id`, `hub_id`, `name`, `cities[]`, `barangays[]` (or a polygon later), `delivery_fee_cents`, `free_delivery_over_cents`, `min_order_cents`.

**`slots`**: `id`, `hub_id`, `date` (Manila local), `starts_at`, `ends_at`, `capacity`, `booked`. Check: `booked <= capacity`. Unique: `(hub_id, starts_at)`.

**`slot_templates`**: the weekly schedule Slots are made from (ADR 0012). `hub_id`, `weekday` (0 Sunday), `start_minute`, `end_minute` (Manila minutes after midnight), `capacity`. Unique: `(hub_id, weekday, start_minute)`. Check: weekday 0 to 6, `start_minute < end_minute <= 1440`, `capacity >= 0`.

**`slot_holds`**: `slot_id`, `cart_id`, `expires_at`.

### inventory

**`stock_levels`**: `(product_id, hub_id)` primary key, `on_hand`, `reserved`, `low_stock_threshold`. Check: `reserved >= 0 AND on_hand >= 0 AND reserved <= on_hand`.

**`stock_movements`**: append-only. `product_id`, `hub_id`, `delta`, `reason` (receipt, reserve, release, pick, shrink, adjustment, return), `order_id?`, `staff_id?`, `note`.

### buying

**`carts`**: `id`, `customer_id?`, `guest_token_hash?`, `voucher_code?`, `checked_out_at?`, `reminded_at?` (its one Cart Reminder was queued, ADR 0014), `updated_at`. A Customer has at most one active Cart.

**`shopping_lists`** (Batch 5.2): `customer_id`, `name` (1 to 60 characters). **`shopping_list_items`**: `(list_id, product_id)`, `quantity` (1 to 99). Up to 20 lists of 100 items each, enforced in the cart module.

**`stock_alerts`**: `customer_id`, `product_id`, `created_at`. Unique: `(customer_id, product_id)`. Deleted when the message is queued or after 30 days.

**`cart_lines`**: `cart_id`, `product_id`, `quantity`, `seen_price_cents` (the price when the line was last set, so the Cart can flag a change), `substitution_preference` (`allow`, `preferred`, `none`), `preferred_product_id?`, `note`. Unique: `(cart_id, product_id)`.

**`orders`**: `id`, `order_no`, `customer_id`, `hub_id`, `slot_id`, `channel` (`web`, later `grab`, `lazada`), `status`, `payment_status`, `address_snapshot` (JSON), `contact_phone`, `rider_notes`, `subtotal_cents`, `discount_cents`, `delivery_fee_cents`, `vat_cents`, `total_cents`, `authorised_cents`, `final_total_cents?`, `voucher_id?`, `idempotency_key` (unique), `placed_at`, `cancelled_at?`, `delivered_at?`.

Dispatch fields on **`orders`** (ADR 0011): `rider_id?` (Staff, a Rider), `delivery_pin?` (4 digits, new per trip), `pin_attempts`, `dispatched_at?`.

**`cash_handovers`**: a Rider's cash counted by the Dispatcher. `rider_id`, `day` (Manila date; **unique with rider_id**), `recorded_cents` (what the Rider recorded at the doors), `counted_cents`, `counted_by`, `note?`, `created_at`. Check: both amounts at or above 0.

**`order_notes`**: Order Notes from staff. `order_id`, `staff_id`, `text` (up to 500 characters), `created_at`.

**`order_lines`**: `order_id`, `product_id`, `name_snapshot`, `unit_price_cents`, `tax_class`, `vat_cents`, `ordered_qty`, `fulfilled_qty`, `ordered_weight_grams?`, `final_weight_grams?`, `line_total_cents`, `substitution_preference`, `preferred_product_id?` and `note?` (copied from the Cart Line for the Picker), `status` (`pending`, `picked`, `short`, `substituted`, `refunded`).

**`substitutions`**: `order_line_id` (**unique**: one per Order Line), `substitute_product_id`, `price_cents` (the substitute's unit price at pick; the Customer pays the lower of this and the ordered price), `quantity`, `token?` (**unique**, the Customer's answer link) and `window_ends_at?` (only when the Customer is asked), `proposed_by`, `customer_response?` (`auto_accepted`, `accepted`, `rejected`; null while waiting), `responded_at`. See [ADR 0010](adr/0010-picking-and-substitutions.md).

**`order_status_events`**: append-only history: `order_id`, `from`, `to`, `actor_type` (`customer`, `staff`, `system`), `actor_id`, `reason`, `at`.

### payments

**`payments`**: `id`, `order_id`, `provider`, `method` (`cod`, `gcash`, `card`, other wallets), `provider_ref` (the hosted checkout), `checkout_url`, `payment_ref` (the provider's id of the completed payment, which refunds name), `amount_cents`, `captured_cents`, `refunded_cents` (check: within `captured_cents`), `collected_note?` (why the cash taken differs from the Final Total), `status`.

**`refunds`**: money going back on a Payment ([ADR 0008](adr/0008-weighed-items-online-and-refunds.md)). `payment_id`, `amount_cents` (check: above 0), `reason` (`cancelled`, `picked`, `late_payment`; **unique with payment_id**, so a trigger never refunds twice), `status` (`pending`, `sending`, `sent`, `needs_review`), `provider_ref?`, `last_error?`, `created_at`, `sent_at?`.

**`payment_events`**: raw provider events. `provider`, `provider_event_id` (**unique with provider**), `type`, `payload`, `received_at`, `processed_at?`.

### customers and content

**`customers`**: profile linked to the auth user: `phone` (verified), `email`, `name`, `marketing_opt_in`, `referral_code?` (unique, made when first shown), `referred_by_id?` (never itself).

**`addresses`**: `customer_id`, `label`, `line1`, `barangay`, `city`, `landmark`, `lat`, `lng`, `zone_id?`, `notes`, `is_default`.

**`recipes`** (Batch 5.1, ADR 0013): `slug` (unique, made once from the title), `title`, `intro`, `photo_url`, `photo_alt`, `servings` (the base the counts are for, 1 to 50), `prep_minutes`, `cook_minutes`, `steps text[]`, `status` (`draft`, `published`), `featured`, `published_at` (set when published).

**`recipe_ingredients`**: `recipe_id`, `product_id?` (null for plain text), `label?` (required without a Product), `note`, `quantity` (to buy for the base servings, 1 to 99), `scales`, `optional` ("usually at home"), `position`.

**`articles`**: `slug`, `title`, `intro`, `photo_url`, `photo_alt`, `sections jsonb` (`[{heading, text}]`), `status`, `published_at`. **`article_products`**: `(article_id, product_id)`, `position`.

**`promotions`** (Batch 5.3, ADR 0015): `name`, `kind` (`percent`, `amount`), `value` (1 to 90 percent, or centavos off each unit), `product_ids uuid[]`, `category_ids uuid[]` (at least one between them), `starts_at < ends_at`, `is_active`.

**`vouchers`**: `code` (unique, upper case, 3 to 24 of A-Z 0-9 -), `kind` (`percent`, `amount`, `free_delivery`), `value`, `max_discount_cents?`, `min_spend_cents`, `starts_at < ends_at`, `usage_limit?`, `per_customer_limit`, `first_order_only`, `is_active`, `customer_id?` (a Referral reward for one Customer). **`voucher_redemptions`**: one per Order (`order_id` unique), `voucher_id`, `customer_id`, `discount_cents`. **`orders.voucher_id?`**.

**`referral_rewards`**: the ledger, one row per invited friend (`referee_id` and `order_id` unique), `referrer_id`, both Vouchers.

**`freshness_claims`** (Batch 5.4, ADR 0016): `order_id`, `order_line_id` (unique: one claim per line), `customer_id`, `reason` (`not_fresh`, `damaged`, `missing`, `wrong_item`), `units`, `note`, `photo_urls[]` (up to 3), `claimed_cents` (worked out by the server), `status` (`open`, `approved`, `rejected`), `resolved_cents?` (up to `claimed_cents`), `payback?` (`refund`, `voucher`), `voucher_id?`, `decided_by_id?`, `decided_at?` (set exactly when not open), `decision_note`. **`refunds.claim_id?`** (unique; set exactly when the reason is `claim`).

**`staff`**, **`audit_log`**: staff identity with role; append-only record of admin writes.

### reporting

**`funnel_counts`** (Batch 5.5, ADR 0017, `src/lib/funnel.ts`): `day` (Manila date), `step` (`product_viewed`, `added_to_cart`, `checkout_started`, `order_placed`), `count`; primary key (`day`, `step`). One atomic upsert per step. No Customer, session, IP or cookie is stored.

## 4. Invariants the schema must enforce

Prefer database constraints over application checks wherever possible.

1. `stock_levels.reserved <= stock_levels.on_hand` and both non-negative.
2. `slots.booked <= slots.capacity`.
3. `payment_events (provider, provider_event_id)` is unique, so duplicate webhooks cannot apply twice.
4. `orders.idempotency_key` is unique, so a double-click cannot place two Orders.
5. `orders.total_cents = subtotal_cents - discount_cents + delivery_fee_cents`; VAT is included in prices and reported separately, never added again.
6. `order_lines.line_total_cents` is derived from the snapshot price, never from the live Product row.
7. Order status changes only through `transitionOrder()` in the orders module; every change has a status-event row.
8. A primary image is unique per Product.
9. A Customer has at most one active Cart.

## 5. Tax

Philippine VAT is 12% on vatable goods; many fresh and unprocessed foods are VAT-exempt. Prices are stored tax-inclusive; `tax_class` decides how much of the line is VAT for receipts. **Confirm the class of each Product category with the business accountant before launch.**

## 6. Seed data (Phase 0 deliverable)

- 1 Hub, 3 Zones, Slot templates for the next 7 days.
- A category tree of about 40 nodes.
- 150 realistic Products across all categories with at least one Weighed Product, one frozen item and one out-of-stock item.
- Staff accounts for each role; 3 test Customers with addresses.
- 5 Recipes (V1) can wait; Vouchers wait for Phase 5.

The seed must be re-runnable on an empty database and produce deterministic data so end-to-end tests are stable.

## 7. Migration policy

Forward-only migrations, reviewed like code. Destructive changes use expand, migrate, contract across two releases. Never edit an applied migration. Backups: daily snapshots plus point-in-time recovery on the production database, with a tested restore before launch.
