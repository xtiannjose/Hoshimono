---
status: accepted
---

# Staff tools for the last runbook gaps

The runbook's "Things the app cannot do yet" still listed five things staff had to work around or hand to the technical person, after the tools of 28 October. The owner asked on 2026-10-29 for everything that needs no outside account. Four of them change a rule an earlier ADR set, so they are recorded here.

## Decision

1. **Staff may cancel an Order that is On the way** (`out_for_delivery` to `cancelled`). The Dispatcher calls the Rider first; the Rider brings it back, and what was picked goes back on the shelf, as for a cancel after the pick. A cash Order's Payment becomes "Not paid"; an online one is refunded in full; the Customer gets the cancel notice. Before this, the Rider had to press **Could not deliver** first, which texted the Customer "we missed you" for an Order they had asked to cancel. Extends the lifecycle in docs/03 section 7 and [ADR 0011](0011-dispatch-pin-and-cash.md).
2. **Staff may file a Freshness Claim for a Customer** who called or wrote in, from the Order page: any time after delivery, with no photo. [ADR 0016](0016-freshness-claims.md)'s 24 hours and photo rule still bind the Customer's own form; staff are trusted to have seen or asked. The claim opens like any other and is decided on its own page, so filing and paying stay two steps. Audited as `file_for_customer`.
3. **A rejected claim can be reopened**, back to open, when the Customer shows more. An approved claim is paid and final: a refund cannot be undone, so more is given as a Voucher (the Order page's goodwill Voucher). The decision message is now sent once per outcome, so a Customer told "not approved" hears the approval too.
4. **A physical count may go below what Orders have reserved.** The shelf number is the truth; the table check `reserved <= on_hand` is dropped (both stay 0 or more). Free stock is never below 0, so the Product stops selling, and the Stock screens show how many are short. The Orders holding those reservations come up short at the pick, as they would anyway, and the pick takes what was packed off the count, never below 0. This replaces [ADR 0012](0012-stock-slots-reports-receipts.md)'s floor that kept a substitute from taking the count below other Orders' reservations: that floor kept the number tidy, not true.
5. **An Order may move to an address in another Zone of the same Hub**, keeping the Delivery Fee it was placed with. The Customer asked for the move; repricing a paid Order would mean a refund or a charge the app cannot make, for a fee difference of ₱20 to ₱30 between today's Zones. Another Hub means a new Order: its stock and Slots are not this one's.

Also, without a rule change: the Order page shows the PayMongo checkout, payment and refund ids to staff who handle refunds, so they can find a payment in the PayMongo dashboard.

## Consequences

- The runbook's workarounds for these five are gone, and its "Not possible in the app yet" notes that the tools of 28 October and these replaced now point to the tools.
- A Rider who arrives at the door with an Order cancelled meanwhile cannot mark it delivered. The Dispatcher's call comes first.
- Stock numbers can show more reserved than on the shelf until those Orders are picked; that is the signal to the Pickers, not a fault.
- Still not possible: Sentry error alerts (needs the account), charging a Customer more after checkout, and changing an Order's Hub.
- Tests: an Order on its way cancelled with its stock back and the Customer told; a count below reserved that stops selling and is settled by the pick; claims filed by staff after the 24 hours and reopened then approved, with both messages sent; an address in another Zone kept at the placed fee, another Hub's refused.
