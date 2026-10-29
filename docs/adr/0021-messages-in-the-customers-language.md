---
status: accepted
---

# Messages in the Customer's language

[ADR 0019](0019-filipino-for-the-rest-of-the-shop.md) translated the shop's pages but left every email and SMS in English: a message goes out from a background job, long after the page that caused it, and nothing recorded which language the Customer used. Sign-in, the delivery areas page and the referral link's landing were also still English. The owner approved finishing these on 2026-10-28.

## Decision

1. **We store one language per Customer**: `customers.lang`, `en` or `fil`, `en` by default (so everyone before this change keeps English). It is the language they last shopped in, not a setting they manage; there is no switch for it on the account page.
2. **It is set where the Customer acts on a page whose language we know**: placing an Order at Checkout (before the Order is placed, so even the first confirmation follows it), saving their name or an address, asking for a Stock Alert, and filing a Freshness Claim. Each of these Server Actions already receives the page's language in its hidden `lang` field ([ADR 0017](0017-filipino-pwa-and-funnel.md)); the customers module writes it with `setCustomerLang`, only when it changes.
3. **Every message to a Customer follows it**: order confirmed, Substitution asked, out for delivery, delivery failed, cancelled by staff, refund issued, claim decided, Cart Reminder, back in stock, the Referral reward (each person in their own language), a Voucher given by staff and the Slot-moved text. Dates and Slots are written in that language, and links open the Filipino pages (`/fil/orders/...`).
4. **The words live in the notifications module** (`src/modules/notifications/internal/words.ts`), with `en` and `fil` side by side, not in `src/i18n`: those dictionaries ship to every browser page, and message words never need to. Each sender takes a `lang`; the job handlers read it with the rest of what the message needs.
5. **Translated pages too**: sign-in (its answers, including "too many tries", now come back as codes from the rate limits and are worded by the action, as in ADR 0019), the delivery areas page, and the referral link: the invite page on a Filipino page shares `/fil/r/<code>`, which lands on the Filipino Home.

## Consequences

- Still English, and why:
  - The sign-in code and link: we do not know who is signing in, so we do not know their language.
  - Staff-written texts go out as typed. Only the fixed parts of a message follow the Customer's language; "Hoshimono:" in front reads the same in both.
  - The pages a message link opens to answer it (a Substitution's yes or no, stopping reminders) are not translated yet, so those links keep their English address.
  - Staff screens, and the Order notes staff read ("Moved to ..."), stay English.
- A Customer who shops in Filipino once and in English later gets English messages from then on. That is the point: the last language they used.
- The Customer's data download includes the stored language ([ADR 0020](0020-customer-data-export-and-deletion.md)).
- Sender tests pass a `lang`; a database test checks that a Filipino Customer's order confirmation text is in Filipino.
- The Filipino is Claude's draft in everyday Taglish for a native speaker to check before launch, the texts first: they are what most Customers read.
