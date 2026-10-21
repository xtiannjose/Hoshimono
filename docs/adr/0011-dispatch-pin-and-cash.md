---
status: accepted
---

# Dispatch, the Delivery PIN and cash on delivery

Batch 4.3 builds dispatch and cash on delivery (PRD ADM-7, ACC-4; docs/03 section 8: "the Rider records collected cash at delivery; Dispatch reconciles per Rider per day"). The plan had no Rider records, and Rider hiring is still a business track. The owner chose every recommended answer on 2026-10-21.

## Decision

1. **Riders use the app.** A new Staff role, `rider`, signs in like other Staff and sees only the Orders assigned to them. Staff gain a mobile number, which the Customer sees once their Order leaves the Hub.
2. **The Dispatcher sends Orders out.** From the dispatch board they pick a Rider for each picked Order; that moves it to `out_for_delivery`. Only the dispatch board does this, and only the Rider (or the Dispatcher, without the PIN, with a reason) marks it delivered.
3. **Proof of delivery is a Delivery PIN.** When the Order leaves, the Customer gets a 4-digit PIN by SMS and email and on their tracking page. The Rider enters it at the door. After 5 wrong tries the Rider must call the Dispatcher, who can mark it delivered with a reason, which the audit log keeps. Photo proof waits for image storage (Cloudflare R2).
4. **A failed delivery says why.** The Rider marks it failed with a reason; the Customer gets a "we missed you" message. The Dispatcher sends it out again or cancels it (a paid Order is refunded in full, ADR 0008).
5. **Cash is counted per Order, then per Rider.** At the door the Rider records the cash for each cash-on-delivery Order, pre-filled with the Final Total; a different amount needs a note. At day's end the Dispatcher counts each Rider's cash and records the handover against the day's recorded total. A shortfall is flagged.

## Consequences

- `StaffRole` gains `rider`; areas gain `dispatch` (Dispatcher and Admin) and `delivery` (Rider and Admin).
- A 4-digit PIN is not a secret against a determined guesser; it proves someone at the address had the Customer's message. The 5-try limit keeps a Rider from guessing it.
- The Customer's tracking page shows the Rider's name and number and the PIN while the Order is out.
- Partner delivery apps (Lalamove, Grab) are not supported; they would need their own adapter.
