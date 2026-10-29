// Public interface of the customers module (docs/03-ARCHITECTURE.md section 3).
// Owns the Customer row (created or linked at sign-in through
// customerForUser), the profile and the Address book.
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
  AddressProblem,
  AddressView,
  SaveAddressResult,
} from "./internal/addresses";
export {
  getProfile,
  isCustomerBlocked,
  setCustomerBlocked,
  setCustomerLang,
  setMarketingOptIn,
  updateName,
} from "./internal/profile";
export type { Profile } from "./internal/profile";
export { customerForUser } from "./internal/link";
export type { AuthUserInfo } from "./internal/link";
export {
  applyReferral,
  getReferralCode,
  listReferrals,
  rewardReferral,
} from "./internal/referrals";
export type { ReferralRefusal } from "./internal/referrals";
export { customerProfileData, eraseCustomerProfile } from "./internal/privacy";
