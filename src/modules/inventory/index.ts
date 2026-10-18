// Public interface of the inventory module (docs/03-ARCHITECTURE.md section 3).
// Owns StockLevel and the stock movements log.
export { getAvailability, getStockStates } from "./internal/stock-states";
export type { Availability, StockState } from "./internal/stock-states";
export {
  OutOfStockError,
  releaseStock,
  reserveStock,
} from "./internal/reserve";
export type { StockLine } from "./internal/reserve";
