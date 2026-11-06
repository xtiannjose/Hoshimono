---
status: accepted
---

# Money given back outside the app, and the last staff gaps

After [ADR 0022](0022-staff-tools-for-the-last-runbook-gaps.md) the runbook still listed things only the technical person could do, or that staff had to keep in Order Notes. The owner asked on 2026-10-29 for every one that needs no account and no new business rule.

## Decision

1. **Staff record money already given back outside the app** as a Refund with the new reason `staff`: a refund made in PayMongo's dashboard (its refund id), or cash or a transfer by hand (how, in `refunds.paid_back_by`). Any number per Payment, never past what was taken. On an online Payment, its status and the Order's follow (partly refunded, refunded). A dashboard refund gets the usual refund message, each told once; one paid another way gets no message, because the app cannot say how it went, and staff text the Customer. A cash Order's Payment stays "Cash collected", so the Rider's day and its count are unchanged. Admins only, from the Order page.
2. **A refund to check can be cleared as "Paid back another way"**, with how. It is sent, with no GCash or card message. Before, "It went through" texted the Customer that it was refunded to their GCash or card when it was not.
3. **One Order's cash can be corrected after the day is counted.** The day's recorded total follows the correction, so the short or over shows against the count. Not below what was already given back.
4. **Staff can close an Order still waiting for payment when PayMongo took a different amount**, after refunding it in PayMongo's dashboard. Its Payment is marked failed, so no paid event can confirm it; the right amount arriving later is refunded as late, as for any closed Order. The lines go back to the Customer's Cart and they are told, as for any staff cancel. Admins only, with a reason for the History.
5. **Staff can type a new address the Customer gives by phone.** It is saved to the Customer's addresses (only where a Zone delivers, as on the shop) and the Order goes there, under [ADR 0022](0022-staff-tools-for-the-last-runbook-gaps.md)'s rule: same Hub, the Delivery Fee as placed.
6. **A job that gave up can be sent back to the queue from the System page** ("Try again"). It gets all its tries again from the next tick; its last error stays until it runs.

## Consequences

- Each is audited (`refund_recorded`, `refund_paid_elsewhere`, `retry`, `address`, a staff `status` change) and the money ones add an Order Note.
- A refund recorded by staff cannot be undone in the app, like any refund. Record it after the money went, not before.
- Still not possible, and why: charging a Customer more after checkout (the app takes one payment per Order); a refund the app sends through PayMongo other than for a cancel, a pick or a Freshness Claim (a business rule to decide); changing an Order's Hub; Sentry error alerts (needs the account).
- Tests: the job sent back to the queue and run; a cash fix after the count moving the recorded total; two dashboard refunds on one Order and its payment status; cash given back with no message; a refund cleared as paid another way with no message; an Order charged a different amount closed by staff, then the right amount refunded as late.
