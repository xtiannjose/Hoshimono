// Public interface of the delivery module (docs/03-ARCHITECTURE.md section 3).
// Owns Hub, Zone, Slot and Slot holds, and resolves an Address to a Zone.
export {
  getDefaultHubId,
  getHubStatus,
  getShopNotice,
  onlinePaused,
  setHubStatus,
  type HubStatus,
} from "./internal/hubs";
export {
  listCoverage,
  listServiceAreas,
  resolveZone,
  type ZoneCoverage,
  type ZoneMatch,
} from "./internal/zones";
export {
  bookSlot,
  closeSlots,
  getSlotHold,
  hasOpenSlot,
  holdSlot,
  listSlots,
  purgeExpiredHolds,
  releaseSlot,
  SLOT_CUTOFF_MINUTES,
  SLOT_HOLD_MINUTES,
} from "./internal/slots";
export type { HoldResult, SlotOption, SlotState } from "./internal/slots";
export {
  addSlotTemplate,
  ensureSlots,
  listSlotTemplates,
  listUpcomingSlots,
  listZonesForAdmin,
  removeSlotTemplate,
  setSlotCapacity,
  setTemplateCapacity,
  updateZoneFees,
} from "./internal/schedule";
