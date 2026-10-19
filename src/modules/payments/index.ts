// Public interface of the payments module (docs/03-ARCHITECTURE.md section 3).
// Owns Payment and PaymentEvent: cash on delivery, and PayMongo behind the
// PaymentProvider interface (ADR 0003).
export { createCodPayment, voidCodPayment } from "./internal/cod";
export { createPaymongo } from "./internal/paymongo";
export type {
  Checkout,
  CheckoutRequest,
  PaymentProvider,
  ProviderEvent,
} from "./internal/provider";
export { paymentProvider } from "./internal/active";
export { handleWebhook, type WebhookResult } from "./internal/webhooks";
