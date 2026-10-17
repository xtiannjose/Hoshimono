// Public interface of the inventory module (docs/03-ARCHITECTURE.md section 3).
// Owns StockLevel and stock movements. Reservations arrive in Batch 2.4.
export { getAvailability, getStockStates } from "./internal/stock-states";
export type { Availability, StockState } from "./internal/stock-states";
