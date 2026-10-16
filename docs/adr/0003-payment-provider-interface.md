---
status: accepted (provider choice deferred to Phase 3)
---

# Payments go through a provider-agnostic interface; provider chosen in Phase 3

Business logic talks only to a `PaymentProvider` interface (`createCheckout`, `capture`, `refund`, `verifyWebhook`, `parseEvent`). Adapters for Xendit and PayMongo are the two candidates; both support GCash and cards in the Philippines. We delay the choice because provider approval is slow, capabilities differ (card pre-authorisation, wallet refunds, fees, payout timing), and the reference site already uses Xendit, which tells us it works but not that it is best for us.

## Consequences

- Cash on delivery is implemented as a first-class method with no provider, so Phase 2 ships without any provider dependency.
- Webhook handlers record raw events with a unique `(provider, provider_event_id)` constraint and are idempotent; the browser return URL is never trusted for payment state.
- Weighed-item handling depends on provider capability (card holds versus wallet charge and refund); the decision is closed in Phase 3 and `03-ARCHITECTURE.md` section 8 is updated.
- Switching provider later means writing a new adapter, not changing Orders or Checkout.
