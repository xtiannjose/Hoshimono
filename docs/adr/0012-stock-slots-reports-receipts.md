---
status: accepted
---

# Stock at picking, the Slot schedule, the daily report and receipts

Batch 4.4 closes Phase 4 (PRD ADM-3, ADM-4, ADM-10). These are operating defaults Claude chose on 2026-10-21 when the owner asked to finish the batch; the owner may revise any of them.

## Decision

1. **Stock leaves the shelf count at `picked`.** Finishing picking releases the Order's reservation and takes what was packed off `on_hand`: pieces found, a weighed line's packs, and substitutes. An Order cancelled after picking puts those items back (movement `return`); one cancelled before picking only releases its reservation, as before.
2. **Stock is kept by Admins and Dispatchers** (the Hub floor), at `/admin/stock`:
   - **Receipts** add what a supplier delivered.
   - **Shrink** removes spoiled or damaged items, with a reason.
   - **A count** sets the shelf number after a physical count, never below what Orders have reserved.
   - **The low-stock list** shows Products at or under their threshold.
3. **Delivery Slots come from a weekly schedule**, generated 7 days ahead by the cron tick (`slot_templates`: weekday, start, end, capacity). The seed's schedule is every day, 8 AM to 8 PM in 2-hour Slots of 20. An Admin changes a window's capacity, adds or removes windows, and closes or resizes one Slot (never below what is booked).
4. **Zone fees** (Delivery Fee, Free-Delivery Threshold, Order Minimum) are edited by Admins only: they change what Customers pay.
5. **The daily report** (Admin and Dispatcher), for a Manila date:
   - **Orders:** placed, delivered and cancelled.
   - **Revenue:** delivered Orders' Final Totals, which already leave out what picking refunded.
   - **Average basket.**
   - **Fill rate:** lines of delivered Orders delivered as ordered, or with an accepted Substitution.
   - **Substitution rate.**
   - **Late deliveries:** delivered after their Slot ended.
6. **Printouts are web pages with a print stylesheet**, not PDF files: a pick sheet and a delivery receipt. The receipt shows the VAT breakdown (VATable, VAT-exempt, zero-rated, VAT) of the Final Total and says it is **not an official receipt** until BIR registration (business track; ADR 0007 questions).

## Consequences

- `StockMovementReason` gains `return`.
- Substitutes were not reserved, so taking one may meet a shelf count that is already off; the count stops at what other Orders have reserved and the movement records what was actually taken.
- The Slot generator never touches existing Slots, so editing the schedule changes only days not yet generated; a single Slot is changed directly.
- Official receipts, invoice numbering and BIR-accredited printing are out of scope until the accountant answers (ADR 0007).
