---
status: accepted
---

# A Customer's data: export and deletion

PRD section 7 and the Data Privacy Act (RA 10173): a Customer may get a copy of their personal data and have it deleted, unless the law requires it kept. Built 28 Oct 2026. These are defaults Claude chose; the owner and the lawyer may revise them (the Privacy Policy says the same).

## Decision

1. **Self-service, from the account page** ("Your data"), not a request to staff: "Download my data" and "Delete my account". A Customer who cannot sign in writes to the Data Protection Officer, as the Privacy Policy says.
2. **The download** is one JSON file (`/api/account/data`, 5 an hour): profile, addresses, Orders with their lines and status history, Shopping Lists, Stock Alerts, Freshness Claims, Vouchers and the log of messages sent. Each module reports its own tables; `src/server/customer-data.ts` puts them together.
3. **Deleting is anonymising, in one transaction.** The person goes: name, email, mobile, sign-in and sessions, addresses, Carts, Shopping Lists, Stock Alerts, the contact number, address, notes and PIN on each Order, what they wrote in claims and the claim photos, and who each message went to. What was sold stays: Orders, lines, payments, refunds, Vouchers and claim decisions, for the tax record (as long as `src/config/legal.ts` `taxRecordYears` says). The Customer row stays as "Deleted customer", because Orders point at it.
4. **Not while something is open:** an Order still on its way, or a claim waiting for staff. The Customer is told why and can delete once it ends.
5. **A sign-in a Staff member also uses is kept**; only the Customer side goes.
6. **Afterwards** the person is signed out and sees a goodbye page. Signing in again with the same email or number makes a new, empty account.

## Consequences

- No new table; each module gains a small `privacy.ts` with its export and erase functions, joined through the caller's transaction.
- Kept on purpose: Order Notes and the audit log, which staff wrote and which may mention the person. The lawyer should say whether they must be scrubbed too.
- Not now: a staff tool to delete an account for a Customer who cannot sign in; until then the Data Protection Officer asks the technical person.
