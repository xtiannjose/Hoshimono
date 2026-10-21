// Public interface of the inventory module (docs/03-ARCHITECTURE.md section 3).
// Owns StockLevel and the stock movements log.
export { getAvailability, getStockStates } from "./internal/stock-states";
export type { Availability, StockState } from "./internal/stock-states";
export {
  OutOfStockError,
  pickStock,
  releaseStock,
  reserveStock,
  returnStock,
} from "./internal/reserve";
export type { PickedStock, StockLine } from "./internal/reserve";
export {
  countStock,
  listStockForAdmin,
  receiveStock,
  recordShrink,
  setLowStockThreshold,
  stockHistory,
} from "./internal/admin";
export type { StockRow } from "./internal/admin";
