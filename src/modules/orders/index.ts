// Public interface of the orders module (docs/03-ARCHITECTURE.md section 3).
// Owns Order, OrderLine, status history and Substitutions.
export {
  MAX_COD_TOTAL_CENTS,
  MAX_OPEN_COD_ORDERS,
  MAX_ORDER_ITEMS,
  placeOrder,
} from "./internal/place-order";
export type { PlaceOrderInput, PlaceOrderResult } from "./internal/place-order";
export {
  abandonPayment,
  cancelOrder,
  confirmPaidOrder,
  expireUnpaidOrders,
  ORDER_CANCELLED_JOB,
  ORDER_CONFIRMED_JOB,
  ORDER_DELIVERED_JOB,
  PAYMENT_WINDOW_MINUTES,
  transitionOrder,
} from "./internal/status";
export type { Actor } from "./internal/status";
export { getOrder, getOrderForNotice, listOrders } from "./internal/read";
export {
  completeDelivery,
  DELIVERY_FAILED_JOB,
  deliverWithoutPin,
  dispatchOrder,
  failDelivery,
  getDeliveryNotice,
  listDeliveriesForRider,
  listDispatchBoard,
  OUT_FOR_DELIVERY_JOB,
} from "./internal/delivery";
export type { BoardRow, DeliveryStop } from "./internal/delivery";
export {
  answerSubstitution,
  finishPicking,
  getPickList,
  getSubstitution,
  proposeSubstitution,
  recordPick,
  SUBSTITUTION_ASKED_JOB,
} from "./internal/picking";
export type {
  PickLine,
  ProposeResult,
  SubstitutionAnswer,
} from "./internal/picking";
export {
  addOrderNote,
  getOrderForStaff,
  listOrdersForStaff,
  MAX_ORDER_NOTE_LENGTH,
  staffMoves,
} from "./internal/staff";
export type { QueueRow, StaffOrderDetail } from "./internal/staff";
export type { OrderDetail, OrderSummary } from "./internal/read";
export { dailyReport, getReceipt } from "./internal/reports";
export { getReorderLines, listBoughtBefore } from "./internal/again";
export {
  eraseOrderContacts,
  hasOpenOrders,
  orderData,
} from "./internal/privacy";
export {
  answerSubstitutionByPhone,
  changeOrderAddress,
  handOverOrder,
  moveOrderSlot,
} from "./internal/changes";
export type { MoveResult } from "./internal/changes";
