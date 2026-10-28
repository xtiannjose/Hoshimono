---
status: accepted
---

# Weighed items paid online, and how refunds work

Batch 3.3 had to settle what [ADR 0003](0003-payment-provider-interface.md) left open: how GCash and card pay for Weighed Products, whose weight is only known at pick, and how money goes back. The owner took every recommended answer on 2026-10-20, after a grilling round on these facts from PayMongo's docs:

- A card hold ("Hold then Capture") must be captured within 7 days, needs the Payment Intent flow with PayMongo's card fields on our page, works only for Visa and Mastercard, and must be switched on by PayMongo. Slots can be booked 7 days ahead, so a hold could lapse before picking.
- PayMongo keeps its transaction fee on refunded payments. Partial refunds may repeat up to the amount paid (cards within 60 days, GCash within 180). A refund cannot be undone, and it waits when the payout balance cannot cover it.

## Decision

1. **Every online method charges the estimate at checkout** through the hosted checkout, cards included. No card holds.
2. **The Final Total follows what was packed and never goes above the estimate.** A lighter pack is charged by weight; a heavier one is on Hoshimono, for every method including cash on delivery. A short line is charged for what was picked. The Delivery Fee and any discount stay as charged. `pricing.priceFinal` computes it.
3. **Paid online, the difference is refunded in one go when picking finishes** (the move to `picked`), not line by line. Cash on delivery, the Final Total is what the Rider collects.
4. **A paid Order that is cancelled is refunded in full, automatically** (by the Customer before picking, or by staff).
5. **Money that arrives after an Order was cancelled is refunded in full, automatically.**
6. **Every centavo is refunded.** No minimum.
7. **A refund is sent at most once.** It is recorded before it is sent. If the provider clearly says no, it is tried again later. If there is no clear answer (no response, or a run cut off mid-send), it is marked for a person to check with the provider, never resent.
8. **The Customer sees both figures**: the estimated total and, once picked, the Final Total and the refund; and gets an email and SMS for each refund.

## Consequences

- One payment flow (hosted checkout) and no card fields on our pages, so PCI scope stays at the hosted-page level. No PayMongo approval is needed for holds.
- Hoshimono pays the PayMongo fee on every refunded centavo, and absorbs heavier picks. Pickers aim at or under the ordered weight; their tolerance stays plus or minus 10%.
- A Customer paying online for weighed items may see a second line (the refund) on their GCash or card statement.
- `refunds` is the ledger: one row per Payment and reason (`cancelled`, `picked`, `late_payment`), so a repeated trigger never refunds twice, and the database check keeps `refunded_cents` within `captured_cents`.
- Refunds marked `needs_review` need a staff screen (Batch 4.1 order queue) and a runbook entry (Batch 6.3). Until then they are logged.
- The refund window (60 days for cards) is far longer than the time from payment to picking, so a picked refund is always possible.

Note, 2026-10-28: the Picker's tolerance is one-sided, not plus or minus 10%. `recordPick` refuses a pack more than 10% over the ordered weight; a lighter pack of any weight is accepted and charged by its weight (docs/03 section 8).
