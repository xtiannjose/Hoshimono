# 5. Money

A shop that gets money wrong by one centavo loses trust, and one that gets it wrong at scale loses money. This chapter explains how Hoshimono stores, computes and shows amounts, how VAT, Promotions and Vouchers work, how the Final Total is set after Picking, and why the server recomputes every total.

## 5.1 Integer centavos (ADR 0002)

Every amount of money in Hoshimono is a **whole number of centavos**. ₱59.00 is stored, computed and passed around as `5900`. ₱1,249.50 is `124950`. This holds in the database, in server code, in what Server Actions return and in what the payment provider receives ([ADR 0002](../adr/0002-money-as-integer-centavos.md)).

**Why not just use ₱59.00 with a decimal point?** Computers store most decimal fractions approximately. In JavaScript, `0.1 + 0.2` is `0.30000000000000004`. Add up a few hundred lines with prices like ₱19.95 and the Cart, the Order, PayMongo and the receipt start to disagree by a centavo. Whole numbers have no such problem: `1995 + 1995` is exactly `3990`.

The rules that follow:

- Every money column ends in `_cents` and is a whole number (`price_cents`, `total_cents`, `refunded_cents`).
- Percentages (VAT, a percent Voucher, a Promotion) are applied with **one** rounding rule, in one function.
- Formatting to "₱1,249.00" happens only at the edge, when a page shows it.
- A total is never recomputed from rounded display values.

## 5.2 `src/lib/money.ts`: the only money tools

This short file is the whole toolbox. Every function refuses anything that is not a safe whole number, so a fraction can never sneak in.

| Function                   | What it does                                                                   | Example                                    |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------ |
| `formatMoney(cents)`       | Writes centavos for people, always with centavos                               | `124900` becomes `₱1,249.00`               |
| `moneyParts(cents)`        | The same, split so a Product card can show the centavos smaller                | `{ whole: "₱1,249", fraction: ".50" }`     |
| `parseMoney(text)`         | Reads what a person typed; `null` for anything unclear or negative             | `"₱1,249.00"` and `"1249"` become `124900` |
| `addMoney(...amounts)`     | Adds centavos, refusing any non-whole number                                   | `addMoney(1995, 1995)` is `3990`           |
| `prorate(cents, num, den)` | Scales an amount by a fraction with the one rounding rule: round half up, once | `prorate(5900, 12, 112)` is `632`          |

`prorate` is the most used. VAT, Unit Prices, weighed lines, percent Vouchers, Promotions, spreading a discount and valuing a Freshness Claim all go through it. It rounds on the size of the amount and then puts the sign back, so a refund of an amount is always exactly the negative of its charge.

## 5.3 VAT: inside the price, never added on top

Philippine VAT is 12%. Hoshimono's prices **include** VAT, like a supermarket shelf. So the VAT inside a vatable price is not 12% of it but 12/112 of it:

> ₱59.00 includes VAT of 5900 × 12 ÷ 112 = 632.14, rounded to 632 centavos, ₱6.32.

Each Product has a **Tax Class** ([glossary](../../GLOSSARY.md#catalogue)):

- `vatable`: 12% VAT inside the price (most packaged goods).
- `vat_exempt`: no VAT (fresh and unprocessed food such as vegetables, fresh meat, rice).
- `zero_rated`: VAT at 0% (rare for a grocer).

The rules ([ADR 0002](../adr/0002-money-as-integer-centavos.md), [ADR 0007](../adr/0007-pricing-rules-ahead-and-tax-to-confirm.md)):

- VAT is worked out **per line**, rounded once, then summed. Never on the total.
- VAT falls on what the Customer actually pays: after a Voucher's discount.
- The Delivery Fee is treated as vatable (delivery is a service).
- VAT is reported for receipts (`vat_cents`) and never added to the total. The database even checks it: `total_cents = subtotal_cents - discount_cents + delivery_fee_cents` (invariant 5 in [04-DATA-MODEL.md](../04-DATA-MODEL.md)).

Two answers are still owed by the accountant: whether the business is VAT-registered at launch (if not, every Tax Class behaves as exempt and receipts show no VAT), and the right Tax Class per Category ([ADR 0007](../adr/0007-pricing-rules-ahead-and-tax-to-confirm.md), "To confirm"). Because Order Lines **snapshot** their tax at Checkout, a later change re-tests `priceCart` but never rewrites a placed Order.

## 5.4 Unit Prices

A **Unit Price** is the price per 100 g, per litre or per piece, so a 400 g pack and a 1 kg pack compare at a glance (PRD section 6). It is computed when the Product is read, in `unitPrice` in `src/modules/catalog/internal/products.ts`, again with `prorate`. A 1 L carton at ₱95.00 has a Unit Price of ₱95.00 per litre; a 400 g pack at ₱78.00 is `prorate(7800, 100, 400)` = 1950, ₱19.50 per 100 g. When a Promotion runs, the Unit Price follows the promoted price.

## 5.5 Promotions: the shelf price

A **Promotion** ([glossary](../../GLOSSARY.md#catalogue), [ADR 0015](../adr/0015-promotions-vouchers-referrals.md)) is a time-boxed price cut on chosen Products and/or Categories: a percent off (1 to 90) or a peso amount off each unit. A top-level Category covers its sub-Categories. While it runs, **the promoted price is the price everywhere**: shelf, Cart, Checkout and the Order Line snapshot. The regular price shows struck through beside it.

How it works in the code:

1. Merchandisers create Promotions at `/admin/promotions`; they are rows in `promotions` owned by `pricing`.
2. Whenever `catalog` builds a Product summary, its `promoted` function asks `pricing.activePromotions()` for every Promotion running now, then `pricing.promotedPrice(product, price, promotions)` for the best price.
3. `promotedPrice` tries each matching Promotion and keeps the **lowest** price. A percent cut is `prorate(price, 100 - percent, 100)`; a peso cut subtracts and never goes below zero.
4. The summary's `priceCents` becomes the promoted price, `compareAtCents` becomes the regular price, and `promotion` names the offer.

Example: Fresh Milk at ₱95.00 with "10% off dairy" running: `prorate(9500, 90, 100)` = 8550, so the shelf shows ₱85.50 with ₱95.00 struck through. If "₱5 off milk" also runs, it gives ₱90.00, which is higher, so 10% off wins.

Because everything that prices a Cart (the Cart, Checkout, Recipes, Shopping Lists, Reorder) starts from these summaries, they all agree. Sorting and price filters on Category pages still use the regular price. Saving a Promotion calls `updateTag("catalog")`, so the shop shows it at once.

## 5.6 Vouchers: one code per Order, on top

A **Voucher** ([glossary](../../GLOSSARY.md#catalogue), [ADR 0015](../adr/0015-promotions-vouchers-referrals.md)) is a code that reduces an Order. There are three kinds:

- **percent**: a percent off the goods, with an optional peso cap (`max_discount_cents`).
- **amount**: a peso amount off the goods.
- **free_delivery**: the Delivery Fee becomes zero. This is not a discount, so it never changes VAT on the goods.

Each Voucher has dates, a minimum spend (on the goods after Promotions), a total use limit, a per-Customer limit (1 unless set), and can be for first Orders only or for one named Customer only (the Referral and store-credit Vouchers). Only signed-in Customers can use Vouchers.

**Checking a code** (`checkVoucher` in `src/modules/pricing/internal/vouchers.ts`) runs these tests in order and returns the first reason that fails:

| Test                                                                                             | Reason if it fails |
| ------------------------------------------------------------------------------------------------ | ------------------ |
| The code exists and is switched on (codes are upper case, spaces removed: "save 10" is "SAVE10") | `not_found`        |
| It has started                                                                                   | `not_started`      |
| It has not ended                                                                                 | `ended`            |
| It is not someone else's personal Voucher                                                        | `not_yours`        |
| For first Orders only: the Customer has no Order that was not cancelled                          | `first_order_only` |
| Uses by Orders not cancelled are under the total limit                                           | `used_up`          |
| This Customer's uses are under their limit                                                       | `used_by_you`      |

A Voucher is **kept on the Cart** (`carts.voucher_code`) and re-checked every time the Cart is priced. If it stops applying (it ended, or the Cart fell under its minimum spend), the Cart says why and takes nothing off. Being under the minimum is not a refusal: the Cart shows "spend ₱X more" (`shortByCents`).

**At Checkout** the Voucher is checked once more under a lock and its use is recorded with the Order (section 5.9), so a Voucher's last use goes to exactly one Order. Uses by cancelled Orders do not count, so cancelling gives the use back.

## 5.7 `priceCart`: the one place a total is computed

`priceCart(lines, context)` in `src/modules/pricing/internal/price-cart.ts` computes every total the Customer sees: in the Cart drawer, on the Cart page, at Checkout, and the numbers stored on the Order. It is **pure**: given the same inputs it always returns the same answer, and it never reads the database or the clock. The caller loads the inputs (current prices with Promotions, the Zone's fees, the Voucher's terms). Being pure makes it easy to test thoroughly: it was the first thing built test-first, and `src/modules/pricing/price-cart.test.ts` pins its rules.

**Inputs:**

- `lines`: each with Product id, quantity (1 to 99), unit price, Tax Class, and whether it is weighed.
- `context.zone`: the Zone's Delivery Fee, Free-Delivery Threshold and Order Minimum, or `null` while the Address is unknown.
- `context.voucher`: the Voucher's terms, if the Customer may use it.

**Steps, in order:**

1. Each line's total is unit price times quantity. The **subtotal** is their sum. The goods amount used for thresholds is this subtotal, before any Voucher.
2. If there is a Voucher, compare the goods to its minimum spend. If met (and there are lines), work out the discount: a percent of the goods (capped), or a peso amount, never more than the goods.
3. **Spread the discount** over the lines in proportion to their totals (`spreadDiscount` in `discounts.ts`), with any centavo left over from rounding going to the largest line ([ADR 0007](../adr/0007-pricing-rules-ahead-and-tax-to-confirm.md), item 1). This is so VAT can fall on what each line really costs.
4. **VAT per line** on (line total minus its share of the discount), 12/112 for vatable lines.
5. **Delivery Fee:** unknown (`null`) while the Zone is unknown; zero if the goods reach the Free-Delivery Threshold, if a free-delivery Voucher applies, or if no line is in stock; otherwise the Zone's fee. Add the VAT inside the fee.
6. **Total** = goods minus discount plus Delivery Fee.
7. **Receipt split:** vatable sales (including the fee), VAT-exempt sales and zero-rated sales, which add up to the total.
8. **Helpers for the page:** how far below the Order Minimum the goods are (`belowMinimumByCents`), how much more for free delivery (`freeDeliveryRemainingCents`), the weighed lines' estimate, and how the Voucher came out.

### A worked example

A Customer in the "Pasig and Mandaluyong" Zone (fee ₱49, free from ₱1,500, minimum ₱500) has:

| Line                                    | Tax Class  | Line total |
| --------------------------------------- | ---------- | ---------- |
| 2 × Fresh Milk 1 L at ₱95.00            | vatable    | ₱190.00    |
| 1 × Pork Liempo, about 1 kg, at ₱320.00 | vat_exempt | ₱320.00    |
| 1 × Rice 5 kg at ₱300.00                | vat_exempt | ₱300.00    |

and the Voucher SAVE10 (10% off, minimum spend ₱500).

1. Subtotal: 19000 + 32000 + 30000 = **81000** (₱810.00). Over the ₱500 minimum, under the ₱1,500 free-delivery threshold.
2. Voucher: minimum met. Discount `prorate(81000, 10, 100)` = **8100** (₱81.00).
3. Spread: milk `prorate(19000, 8100, 81000)` = 1900; pork 3200; rice 3000. They sum to 8100, so no leftover centavo.
4. VAT: milk pays 19000 − 1900 = 17100, VAT `prorate(17100, 12, 112)` = 1832. Pork and rice are exempt: 0.
5. Delivery Fee: 4900 (₱49.00), with VAT `prorate(4900, 12, 112)` = 525.
6. Total: 81000 − 8100 + 4900 = **77800** (₱778.00). VAT inside: 1832 + 525 = 2357 (₱23.57).
7. Receipt split: vatable 17100 + 4900 = 22000; exempt (32000 − 3200) + (30000 − 3000) = 55800; zero-rated 0. Check: 22000 + 55800 = 77800.
8. The Cart also says "₱690.00 more for free delivery" (150000 − 81000), judged on the goods before the Voucher.

## 5.8 Weighed Products: estimate first, Final Total after

A **Weighed Product** ([glossary](../../GLOSSARY.md#catalogue)) is sold by weight, but nobody knows the exact weight until a Picker weighs it. Hoshimono handles this in two steps.

**At Checkout, the estimate.** A weighed Product's price is for its estimated pack ("Pork Liempo, about 1 kg, ₱320.00"). Quantity times price is the estimate, and that is what the Order total includes. `placeOrder` stores the estimated weight on the Order Line: `ordered_weight_grams` = pack size in grams × quantity. Pages say "about" and the confirmation message says "Estimated total ... The final amount follows the weight we pack."

**After Picking, the Final Total** ([glossary](../../GLOSSARY.md#buying), [ADR 0008](../adr/0008-weighed-items-online-and-refunds.md)). When the Order moves to `picked`, `transitionOrder` calls `pricing.priceFinal`, which charges each line by what was packed, **never above its checkout amount**. `chargedLine` in `src/modules/pricing/internal/price-final.ts`:

- **A weighed line**: `prorate(line total, min(packed grams, ordered grams), ordered grams)`. 920 g of a ₱320.00 1 kg estimate is `prorate(32000, 920, 1000)` = 29440, ₱294.40. 1,080 g is capped at 1,000 g: ₱320.00. A heavier pack is on Hoshimono.
- **A counted line**: the share for the pieces found. 2 of 3 found on a ₱150.00 line is `prorate(15000, 2, 3)` = 10000.
- **An accepted Substitution** adds the substitute's units at the lower of the substitute's price and the ordered price, for no more units than were missing ([ADR 0010](../adr/0010-picking-and-substitutions.md)). A refused one adds nothing.

`priceFinal` adds the charged lines, keeps the Delivery Fee and the checkout discount as charged, but never takes off more discount than the goods now come to. The Order Minimum and the Free-Delivery Threshold are **not** judged again: if Picking leaves an Order lighter than either, no fee is added and nothing more is asked ([ADR 0007](../adr/0007-pricing-rules-ahead-and-tax-to-confirm.md), item 3).

The difference `total_cents - final_total_cents` is what happens next:

- **Paid online**: refunded in one go (chapter 7).
- **Cash on delivery**: the Final Total is simply what the Rider collects.

The printed Delivery Receipt uses `pricing.receiptBreakdown`, which applies the same rules to what was actually charged: the discount spread over the charged lines before VAT, never more than they come to, and the same vatable, exempt and zero-rated split.

## 5.9 Why the server recomputes every total

The browser shows totals, but it never decides them. The Checkout form does send back the total the Customer saw (`expectedTotalCents`), but only as a **check**, never as the amount to charge:

1. `placeOrder` loads the Cart again on the server and runs `priceCart` with today's prices, today's Promotions, the Address's Zone and the Voucher re-checked now.
2. If the server's total differs from what the Customer saw, the Order is **not** placed. The answer is `{ ok: false, reason: "total_changed", totalCents }` and the page says "Prices changed while you were checking out. Your total is now ₱X. Please check it and place your order again."
3. Only if they match does the Order get written, with the server's numbers.

This protects against three things:

- **Tampering.** Anyone can edit what their browser sends. A total of ₱1 typed into the form changes nothing but the refusal message.
- **Changes in the meantime.** A Promotion ended, a price was edited, a Voucher's last use was taken, the Customer picked an Address in another Zone with a different fee.
- **The Customer being surprised.** They never pay a different amount from the one they saw; if it changed, they see the new one first.

The same principle covers stock (re-checked under lock when reserving) and Slot places (re-checked under lock when booking), in chapter 6. And the Order Lines then **snapshot** the name, unit price, Tax Class and VAT, so later catalogue edits never rewrite a past Order ([CLAUDE.md](../../CLAUDE.md), invariant 6 in [04-DATA-MODEL.md](../04-DATA-MODEL.md)).

## Where to look in the code

| Topic                                  | File                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Money tools and the rounding rule      | `src/lib/money.ts` (tests: `src/lib/money.test.ts`)                                  |
| Cart and Checkout totals               | `src/modules/pricing/internal/price-cart.ts`                                         |
| Spreading a discount, Voucher amounts  | `src/modules/pricing/internal/discounts.ts`                                          |
| The Final Total and receipts           | `src/modules/pricing/internal/price-final.ts`                                        |
| Promotions                             | `src/modules/pricing/internal/promotion-price.ts`, `promotions.ts`                   |
| Vouchers                               | `src/modules/pricing/internal/vouchers.ts`                                           |
| Where Promotions enter the shelf price | `src/modules/catalog/internal/products.ts` (`promoted`)                              |
| Unit Prices                            | `src/modules/catalog/internal/products.ts` (`unitPrice`)                             |
| The tests                              | `src/modules/pricing/price-cart.test.ts`, `price-final.test.ts`, `discounts.test.ts` |

## Check yourself

<details>
<summary>A vatable item costs ₱112.00. How much VAT is inside it?</summary>

`prorate(11200, 12, 112)` = 1200, so ₱12.00. VAT is 12/112 of a VAT-inclusive price.
</details>

<details>
<summary>A Cart has ₱1,450 of goods in a Zone that delivers free from ₱1,500, and a ₱100-off Voucher. Is delivery free?</summary>

No. The threshold is judged on the goods before the Voucher (₱1,450), which is under ₱1,500, so the Delivery Fee applies. Had the goods been ₱1,550, delivery would be free even though the Customer pays ₱1,450 after the Voucher.
</details>

<details>
<summary>A Customer paid ₱778.00 by GCash. Picking packs 920 g of the 1 kg pork. What is refunded?</summary>

The pork line drops from 32000 to 29440, so the goods drop by 2560. The Voucher discount stays as charged (8100), as does the fee, so the Final Total is 77800 − 2560 = 75240, and ₱25.60 is refunded in one go when the Order moves to `picked`.
</details>
