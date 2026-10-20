// The PaymentProvider interface (ADR 0003). Orders and Checkout talk to
// this, never to a provider's API directly.

/** A provider event, reduced to what the ledger acts on. */
export type ProviderEvent = {
  /** The provider's event id: the ledger's idempotency key. */
  id: string;
  /** The provider's own event type, stored as-is. */
  type: string;
  /** A completed payment, or anything else (recorded, not acted on). */
  kind: "paid" | "other";
  /** The checkout or payment reference stored on our Payment. */
  providerRef: string | null;
  /** For a paid event: the provider's id of the payment itself, which refunds name. */
  paymentRef: string | null;
  amountCents: number | null;
};

export type CheckoutRequest = {
  /** Our reference, shown in the provider's dashboard: the Order Number. */
  reference: string;
  /** The one line the hosted page shows, such as "Hoshimono order SW-...". */
  description: string;
  amountCents: number;
  methods: ("gcash" | "card")[];
  successUrl: string;
  cancelUrl: string;
};

export type Checkout = {
  /** Stored on the Payment; webhooks name it. */
  providerRef: string;
  /** Where the Customer pays. */
  redirectUrl: string;
};

export interface PaymentProvider {
  /** The name stored on Payments and payment events, such as "paymongo". */
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<Checkout>;
  /**
   * Close a hosted checkout so it can no longer be paid. "refused" when the
   * provider will not: it is paid, or a payment is still going through.
   */
  expireCheckout(providerRef: string): Promise<"expired" | "refused">;
  /** Take the final amount of a card hold (Weighed Products, Batch 3.3). */
  capture(holdRef: string, amountCents: number): Promise<void>;
  /**
   * Return part or all of a completed payment. ok false: the provider said
   * no, nothing moved, and asking again later is safe. Throws when the
   * outcome is unknown (no answer), so it must never be resent blindly.
   */
  refund(
    paymentRef: string,
    amountCents: number,
    note: string
  ): Promise<{ ok: true; refundRef: string } | { ok: false; reason: string }>;
  /** True only for a request the provider signed for this account and mode. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  parseEvent(rawBody: string): ProviderEvent;
}
