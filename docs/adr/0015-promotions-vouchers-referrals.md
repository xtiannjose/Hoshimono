---
status: accepted
---

# Promotions, Vouchers and Referrals

Batch 5.3 (PRD ADM-8, CRT-5, ACC-7, CAT-1 Promotions). The owner chose on 2026-10-21: Promotions are a percent or peso off, Vouchers give a percent off, a peso off or free delivery, one Voucher may be used on top of Promotions, and a Referral gives each side a ₱100 Voucher. The other points are defaults Claude chose; the owner may revise them. ADR 0007 already fixed how a discount meets VAT.

## Decision

1. **A Promotion changes the shelf price.** It is a percent off (1 to 90) or a peso amount off each unit, for chosen Products and/or Categories (a top-level Category covers its sub-Categories), between two dates. While it runs, the Product's price everywhere (shelf, Cart, Checkout, the Order Line snapshot) is the promoted price, with the regular price struck through beside it. When two Promotions cover a Product, the lower price wins. Merchandisers and Admins run them at `/admin/promotions`.
2. **A Voucher is a code** for a percent off the goods (with an optional peso cap), a peso amount off, or free delivery. It has dates, a minimum spend (on the goods after Promotions), a total use limit, a per-Customer limit (1 unless set), and can be for first Orders only or for one Customer only. Merchandisers and Admins manage them at `/admin/vouchers`. A Voucher with uses is switched off, never deleted.
3. **One Voucher per Order, on top of Promotions.** The Customer adds it in the Cart or at Checkout, signed in. It is kept on the Cart and re-checked every time the Cart is priced: if it stops applying (the spend falls under the minimum, it ended), the Cart says why and charges nothing off. At Checkout it is re-checked under a lock and recorded against the Order, so a Voucher's last use goes to exactly one Order. Uses by cancelled Orders do not count.
4. **Money rules** (ADR 0007): a percent or peso Voucher is a discount on the goods, spread over the lines in proportion to their totals before VAT, the leftover centavo to the largest line; it never touches the Delivery Fee. Free delivery sets the fee to zero and is not a discount. The Order Minimum and Free-Delivery Threshold are judged on the goods after Promotions, before the Voucher. After picking, the discount stays as at Checkout, but never more than what was picked.
5. **Referrals**: every Customer has a code and a share link (`/r/<code>`). A friend who opens it and places their first Order is linked to them. When that first Order is delivered, both get a personal ₱100 Voucher (minimum spend ₱500, 60 days, one use) by email, and the referrer's account lists it. One reward per invited friend.
6. **Home** shows Products on Promotion ("On sale this week").

## Consequences

- New tables `promotions`, `vouchers`, `voucher_redemptions`, `referral_rewards`; `orders.voucher_id`; `customers.referral_code` and `referred_by_id`. `pricing` owns Promotions and Vouchers; `customers` owns referral links and the reward ledger.
- `catalog` asks `pricing` for promoted prices when it builds Product summaries; sorting by price still uses the regular price.
- Substitutes keep their rule: never above the ordered line's price (ADR 0010).
- Not now: buy-X-get-Y, store credit, Vouchers for guests, stacking two Vouchers, a referral cap per Customer (watch for abuse after launch).
