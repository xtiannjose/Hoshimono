// Public interface of the orders module (docs/03-ARCHITECTURE.md section 3).
// Owns Order, OrderLine, status history and Substitutions.
export {
  MAX_COD_TOTAL_CENTS,
  MAX_OPEN_COD_ORDERS,
  placeOrder,
} from "./internal/place-order";
export type { PlaceOrderInput, PlaceOrderResult } from "./internal/place-order";
export {
  cancelOrder,
  confirmPaidOrder,
  ORDER_CONFIRMED_JOB,
  transitionOrder,
} from "./internal/status";
export type { Actor } from "./internal/status";
export { getOrder, getOrderForNotice, listOrders } from "./internal/read";
export type { OrderDetail, OrderSummary } from "./internal/read";
