// Public interface of the notifications module (docs/03-ARCHITECTURE.md
// section 3). Owns message templates, providers and the delivery log.
export { sendOrderConfirmed } from "./internal/order-confirmed";
export type { OrderConfirmedNotice } from "./internal/order-confirmed";
export { sendRefundIssued } from "./internal/refund-issued";
export type { RefundNotice } from "./internal/refund-issued";
export { sendSubstitutionAsked } from "./internal/substitution-asked";
export type { SubstitutionNotice } from "./internal/substitution-asked";
export { lastMessage } from "./internal/providers";
export { sendSignInCode, sendSignInLink } from "./internal/sign-in";
export type { EmailProvider, Sent, SmsProvider } from "./internal/providers";
