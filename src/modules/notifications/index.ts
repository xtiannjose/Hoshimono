// Public interface of the notifications module (docs/03-ARCHITECTURE.md
// section 3). Owns message templates, providers and the delivery log.
export { sendOrderConfirmed } from "./internal/order-confirmed";
export type { OrderConfirmedNotice } from "./internal/order-confirmed";
export { lastMessage } from "./internal/providers";
export { sendSignInCode } from "./internal/sign-in-code";
export type { EmailProvider, Sent, SmsProvider } from "./internal/providers";
