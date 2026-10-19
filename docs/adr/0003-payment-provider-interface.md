---
status: accepted
---

# Payments go through a provider-agnostic interface; PayMongo is the provider

Business logic talks only to a `PaymentProvider` interface (`createCheckout`, `capture`, `refund`, `verifyWebhook`, `parseEvent`). The choice between Xendit and PayMongo, both of which take GCash and cards in the Philippines, was deferred to Phase 3 because provider approval is slow and their capabilities differ.

**Decided 2026-10-19 (owner): PayMongo.** Compared on what Hoshimono needs:

- Fees, VAT included: GCash 2.23% against Xendit's 2.58% (2.3% plus VAT); local cards 3.125% + PHP 13.39 against 3.58% + PHP 11.20. On PHP 1M a month that is roughly PHP 3,500 to 4,500 less.
- Webhooks are signed with HMAC-SHA256 over a timestamp and the raw body (`Paymongo-Signature`), so a forged or altered event fails verification. Xendit sends one static `X-CALLBACK-TOKEN`, which would force a re-fetch of every payment before acting.
- Partial refunds on GCash (180-day window), Maya and cards, which weighed items and short picks need.
- Card holds exist ("Hold then Capture", enabled per account by PayMongo support).

Xendit's same-day e-wallet void (fees returned) and wider bank and over-the-counter coverage were weighed and judged less important while cash on delivery covers customers without wallets or cards.

## Consequences

- Cash on delivery stays a first-class method with no provider.
- Webhook handlers verify the signature first, then record the raw event under the unique `(provider, provider_event_id)` constraint, so a repeated event is acknowledged and ignored. The browser return URL is never trusted for payment state.
- PayMongo's hosted Checkout Session documents no manual capture, so a card hold for a Weighed Product would need the Payment Intent flow with PayMongo's card fields on our page. Batch 3.3 decides between that and charging the estimate and refunding the difference, as wallets do; `03-ARCHITECTURE.md` section 8 follows that decision.
- A Checkout Session does not expire on its own: the 15-minute unpaid-Order job (Batch 3.2) must expire it through the API as well as cancel the Order.
- To confirm during the test-mode trial: payout timing, business verification lead time, how long a card hold lasts, and whether a refund returns the transaction fee.
- Switching provider later means writing a new adapter, not changing Orders or Checkout.
