---
status: accepted
---

# Pricing rules decided ahead of their phase, and the tax answers still owed

Batch 2.1 built `priceCart` with the rules in [03-ARCHITECTURE.md](../03-ARCHITECTURE.md) section 5: 12/112 VAT per line rounded once (ADR 0002), a vatable Delivery Fee, receipt figures that sum to the total, and the Free-Delivery Threshold met at or above its amount. The owner decided on 2026-10-19 the rules below for later phases, without the accountant, so they do not have to be re-argued when Phases 4 and 5 arrive. Changing one later means re-testing `priceCart`, never rewriting placed Orders, because Order Lines snapshot their tax.

## Decided ahead

1. **Discounts (Phase 5).** An Order-level Promotion or Voucher is spread across lines in proportion to their totals before VAT is worked out, so VAT falls on what the Customer pays; the centavo left over from rounding goes to the largest line. Discounts never reduce the Delivery Fee.
2. **Free-delivery Voucher (Phase 5).** It sets the Delivery Fee to zero; it is not a discount.
3. **After Picking (Phase 4).** The Order Minimum and Free-Delivery Threshold are judged once, at Checkout, on estimated weights. If Picking leaves an Order lighter, short or substituted below either, no Delivery Fee is added and nothing more is asked; Hoshimono absorbs it.
4. **Senior Citizen and PWD discount.** Not built for the MVP unless the accountant answers item 4 below with "required at launch"; if so, it gets its own batch and ADR.

## To confirm

| #   | Who        | Question                                                                                                                                                                                                                                                                                                                                                                                                     | Needed by          |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| 1   | Accountant | Is the business VAT-registered at launch? Registration is mandatory above PHP 3M yearly sales. If not, receipts show no VAT and every Tax Class behaves as VAT-exempt.                                                                                                                                                                                                                                       | Batch 4.4 receipts |
| 2   | Accountant | Tax Class per Category. Our reading of NIRC Section 109: raw farm and sea food stays exempt after simple preservation (freezing, drying, salting, smoking), and ordinary salt and raw cane sugar are exempt. If so, "Frozen Shrimp, Peeled" and any dried fish, salt or raw sugar Products are wrongly vatable in the seed. Also confirm the current receipt format after the 2024 Ease of Paying Taxes Act. | Batch 4.4 receipts |
| 3   | Owner      | Real Delivery Fees, Free-Delivery Thresholds and Order Minimums per Zone. The seed amounts (PHP 49, 69, 79; free from 1,500, 2,000, 2,500; minimums 500, 700, 800) are placeholders.                                                                                                                                                                                                                         | Soft launch        |
| 4   | Accountant | Does the 5% Senior Citizen and PWD discount on basic necessities and prime commodities apply to our online sales at launch, with what weekly cap and receipt lines?                                                                                                                                                                                                                                          | Phase 6            |

Seed prices pair real brands with invented amounts. They must not appear on a public preview until supplier price lists replace them (business track in [07-ROADMAP.md](../07-ROADMAP.md) section 11).

## Considered options

- **Discounts taken only from vatable lines.** Rejected: VAT would fall by more than the Customer's real saving.
- **Re-checking thresholds after Picking.** Rejected: charging a Delivery Fee the Customer was told they would not pay breaks trust, for small amounts.
