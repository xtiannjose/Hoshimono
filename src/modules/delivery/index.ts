// Public interface of the delivery module (docs/03-ARCHITECTURE.md section 3).
// Owns Hub, Zone, Slot and Slot holds, and resolves an Address to a Zone.
export { getDefaultHubId } from "./internal/hubs";
export {
  getZone,
  listServiceAreas,
  resolveZone,
  type ZoneMatch,
} from "./internal/zones";
export {
  bookSlot,
  getSlotHold,
  holdSlot,
  listSlots,
  purgeExpiredHolds,
  releaseSlot,
  SLOT_CUTOFF_MINUTES,
  SLOT_HOLD_MINUTES,
} from "./internal/slots";
export type { HoldResult, SlotOption, SlotState } from "./internal/slots";
