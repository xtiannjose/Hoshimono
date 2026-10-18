// Public interface of the payments module (docs/03-ARCHITECTURE.md section 3).
// Owns Payment and PaymentEvent. Cash on delivery only until Phase 3 adds
// the provider adapters, createPayment, handleWebhook and refund.
export { createCodPayment, voidCodPayment } from "./internal/cod";
