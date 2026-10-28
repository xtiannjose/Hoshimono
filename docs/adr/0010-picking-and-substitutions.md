---
status: accepted
---

# Picking and Substitutions

Batch 4.2 builds the Picker's view and Substitutions (PRD ADM-6, CRT-3). The PRD promises Substitution control per line and no overcharging, but not how a Substitution is priced, when the Customer is asked, or what a Picker may do with a weighed line. The owner chose every recommended answer on 2026-10-21.

## Decision

1. **The Customer pays the lower price.** A Substitution is charged at the substitute's price or the ordered Product's price, whichever is lower, per unit. A pricier substitute costs nothing extra; a cheaper one lowers the Final Total, and paid online the difference is refunded with the rest at `picked` ([ADR 0008](0008-weighed-items-online-and-refunds.md)).
2. **The Customer's Substitution Preference decides who agrees:**
   - **"Pick a similar item" (`allow`):** the Picker chooses; the Customer gets an SMS and email with a link and has the 10-minute Substitution Window to refuse. Silence is a yes (`auto_accepted`).
   - **"I'll choose" (`preferred`):** only the Product the Customer named; no question, it is already their choice (`auto_accepted` at once).
   - **"No substitute" (`none`):** never substituted; the line is short.
3. **Weighed lines are never substituted.** The Picker packs what is there (its weight sets the price) or marks it short.
4. **A Substitution covers what is missing.** The Picker records how many of the ordered Product they found; the Substitution covers the rest, one per Order Line.
5. **The Pick List follows the Category tree** (top-level order, then sub-Category order, then name) until the Hub has aisle codes.
6. **Picking finishes only when every Substitution is answered or its window has ended.** Moving to `picked` then sets the Final Total; a refused Substitution leaves that part of the line unpaid.

## Consequences

- The Customer answers without signing in: the link carries a random token for that one Substitution (unguessable, single purpose). It can only accept or refuse that Substitution, and only while its window is open.
- The Picker may wait up to 10 minutes for an answer before finishing an Order; they pick the other Orders meanwhile.
- Stock: the substitute is taken from the shelf but not yet deducted from stock; stock movements for picked and substituted items come with Batch 4.4 (stock receipts and adjustments).
- A Picker can be over by at most 10% on a weighed line (docs/03 section 8); a heavier pack must be repacked.

Note, 2026-10-28: the stock consequence above was superseded by [ADR 0012](0012-stock-slots-reports-receipts.md). Since Batch 4.4, `pickStock` takes an accepted substitute off the shelf count when the Order moves to `picked`; a refused one stays on the shelf.
