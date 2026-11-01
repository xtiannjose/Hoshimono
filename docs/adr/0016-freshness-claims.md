---
status: accepted
---

# Freshness Claims

Batch 5.4 (PRD ACC-6; the launch exit criterion of fewer than 3 Freshness Claims per 100 Orders). The owner chose on 2026-10-22: online payments are refunded and cash Orders get a Voucher, Admins and Dispatchers review, a photo is required for spoiled or damaged items, and staff review every claim. The other points are defaults Claude chose; the owner may revise them.

## Decision

1. **A Customer files a claim from a delivered Order, within 24 hours of delivery**, one claim per Order Line: the reason (spoiled or not fresh, damaged, missing, wrong item), how many of the line's items (a weighed line is claimed whole), an optional note, and photos (1 to 3, required for spoiled or damaged).
2. **What a claim is worth is worked out by the server**: the share of what the line was charged after picking for the items claimed, less that share of the Order's Voucher discount (spread as ADR 0007 says). The Customer never types an amount.
3. **Admins and Dispatchers review every claim** at `/admin/claims`: approve it in full, approve a smaller amount, or reject it with a reason the Customer sees. Every decision is audited.
4. **Paying back**: an Order paid with GCash or card is refunded to it, through the refund flow of ADR 0008 (one refund per claim, never more than is left of the payment). A cash Order, or an online one with nothing left to refund, gets a personal Voucher for the amount, with no minimum spend, for 90 days.
5. **The Customer hears the decision** by email, or SMS without one, with the amount and how it comes back, or why it was rejected. The Order page shows each claim and its status.
6. **The daily report counts claims** and claims per 100 delivered Orders.

## Consequences

- New `claims` module and `freshness_claims` table; `RefundReason` gains `claim` and `refunds.claim_id` (unique). A Payment keeps one refund per reason for the other reasons (now a partial unique index), so several claims on one Order each get their own refund.
- Claim photos are stored like Product photos (local disk until R2), resized to at most 1600 pixels.
- Not now: claims after 24 hours (staff can still issue a Voucher by hand), automatic approval, asking the Customer to return the item, claims on substitutes separately from their line.
