---
status: accepted
---

# Pricing, VAT and delivery thresholds for `priceCart`

`pricing.priceCart` (Batch 2.1) needs fixed rules for VAT, discounts, Delivery Fees and thresholds before it can be built test-first. These are the owner's provisional defaults, chosen 2026-10-19 without the accountant so Phase 2 is not blocked. They follow [ADR 0002](0002-money-as-integer-centavos.md) and the seed data. Items marked **To confirm** must be checked before Phase 4 receipts and before launch; changing them later means re-testing `priceCart` but never rewriting placed Orders, because Order Lines snapshot their tax.

## Rules

**Tax status**

1. Build as a VAT-registered business: 12% VAT, included in every shelf price. **To confirm** (accountant): VAT registration is mandatory above PHP 3M yearly sales and optional below. A non-VAT business would show no VAT on receipts, so Phase 4 receipts would change.
2. Each Product carries one Tax Class. VAT-exempt: fruit, vegetables, herbs and aromatics, pork, chicken, beef, fish and seafood, eggs, rice. Everything else is vatable. This is the seed mapping. **To confirm** (accountant): our reading of NIRC Section 109 is that raw food stays exempt after simple preservation (freezing, drying, salting, smoking), and that ordinary salt and raw cane sugar are exempt. If so, "Frozen Shrimp, Peeled" and any dried fish, salt or raw sugar Products should be VAT-exempt, not vatable.
3. Zero-rated stays in the schema but no Product uses it.

**VAT arithmetic**

4. VAT on a vatable line is `prorate(lineTotal, 12, 112)`: 12/112 of the VAT-inclusive amount, round half up, once per line, then summed. VAT-exempt and zero-rated lines carry no VAT.
5. The Delivery Fee is vatable, with its VAT worked out the same way (PHP 49.00 carries PHP 5.25).
6. `priceCart` returns the four receipt figures: VATable Sales (net of VAT), VAT-Exempt Sales, Zero-Rated Sales and VAT Amount. They always add up to the Order total, to the centavo.

**Discounts**

7. An Order-level discount is spread across lines in proportion to their totals before VAT is worked out, so VAT falls on what the Customer actually pays. Any centavo left over from rounding goes to the largest line. Discounts never reduce the Delivery Fee.
8. A free-delivery Voucher sets the Delivery Fee to zero; it is not a discount.
9. Phase 2 has no Promotions: `priceCart` takes them as an input that is always empty and returns zero discount. Promotion and Voucher rules arrive in Phase 5. A compare-at price is display only: it is never a discount and never appears on a receipt.

**Order Minimum and Free-Delivery Threshold**

10. Both are measured on the merchandise subtotal after discounts, VAT included, Delivery Fee excluded.
11. A Cart qualifies at or above the amount (PHP 1,500.00 qualifies for a PHP 1,500 threshold), although the column is named `free_delivery_over_cents`.
12. Amounts are per Zone, from the seed until the owner sets real ones: Pasig and Mandaluyong fee PHP 49, free from PHP 1,500, minimum PHP 500; Makati and Taguig PHP 69, PHP 2,000, PHP 700; Quezon City South PHP 79, PHP 2,500, PHP 800. **To confirm** (owner): real fees and amounts per Zone. The PRD's flat PHP 59 is replaced by these.
13. Both are judged once, at Checkout, on estimated weights. If Picking leaves the Order lighter, short or substituted below a threshold, we do not add a Delivery Fee or ask for more; Hoshimono absorbs it.

**Weighed Products**

14. A Weighed Product's `price_cents` is the price of its listed estimated weight (Tomatoes: PHP 60.00 for approx. 500 g), as the storefront already shows. The Checkout line is that price times quantity. The final line after Picking is `prorate(price_cents, finalGrams, packGrams)`, rounded once per line. Authorise and refund handling stays in Phase 3 ([03-ARCHITECTURE.md](../03-ARCHITECTURE.md) section 8).

**Not in the MVP**

15. Senior Citizen and PWD discounts are not built. **To confirm** (accountant): Philippine law gives seniors and persons with disability a 5% discount on basic necessities and prime commodities, with a weekly purchase cap. Whether it applies to our online sales at launch, and how to verify IDs and record it on receipts, needs an answer before public launch. If required, it becomes its own batch and ADR.

## Considered options

- **VAT on the whole Order instead of per line.** Rejected: it can differ from per-line by a few centavos, and ADR 0002 already fixed per-line rounding so a line refund always equals its charge.
- **Discounts taken only from vatable lines.** Rejected: it lowers VAT more than the Customer's real saving justifies and is harder to explain on a receipt.
- **Re-checking thresholds after Picking.** Rejected: charging a Delivery Fee the Customer was told they would not pay breaks trust, and the amounts involved are small.
