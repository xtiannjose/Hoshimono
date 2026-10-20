// Public interface of the payments module (docs/03-ARCHITECTURE.md section 3).
// Owns Payment and PaymentEvent: cash on delivery, and PayMongo behind the
// PaymentProvider interface (ADR 0003).
export { createCodPayment, voidCodPayment } from "./internal/cod";
export { createOnlinePayment } from "./internal/online";
export { closeOnlinePayment, startCheckout } from "./internal/checkout";
export { fakePaidWebhook } from "./internal/fake";
export { createPaymongo } from "./internal/paymongo";
export type {
  Checkout,
  CheckoutRequest,
  PaymentProvider,
  ProviderEvent,
} from "./internal/provider";
export { paymentProvider } from "./internal/active";
export {
  getRefundNotice,
  REFUND_JOB,
  refundOrderPayment,
  sendRefund,
} from "./internal/refunds";
export {
  handleWebhook,
  type WebhookOptions,
  type WebhookResult,
} from "./internal/webhooks";
