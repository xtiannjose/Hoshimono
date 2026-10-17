// Public interface of the customers module (docs/03-ARCHITECTURE.md section 3).
// Owns the Address book. Customer rows are still created at sign-in by
// identity (Batch 0.4); the profile moves here with the account area (2.6).
export {
  deleteAddress,
  getAddress,
  getDefaultAddress,
  listAddresses,
  MAX_ADDRESSES,
  saveAddress,
  setDefaultAddress,
} from "./internal/addresses";
export type {
  AddressField,
  AddressView,
  SaveAddressResult,
} from "./internal/addresses";
