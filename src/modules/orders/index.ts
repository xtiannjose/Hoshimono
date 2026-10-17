// Public interface of the orders module (docs/03-ARCHITECTURE.md section 3).
// Owns Order, OrderLine, status history and Substitutions.
export { normalizePhone, placeOrder } from "./internal/place-order";
export type { PlaceOrderInput, PlaceOrderResult } from "./internal/place-order";
export { cancelOrder, transitionOrder } from "./internal/status";
export type { Actor } from "./internal/status";
export { getOrder, listOrders } from "./internal/read";
export type { OrderDetail, OrderSummary } from "./internal/read";
