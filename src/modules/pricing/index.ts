// Public interface of the pricing module (docs/03-ARCHITECTURE.md section 3).
// Every total in the Cart, Checkout and on the Order comes from priceCart,
// which is pure. The module also owns Promotions and Vouchers (ADR 0015).
export { MAX_LINE_QUANTITY, priceCart } from "./internal/price-cart";
export {
  chargedLine,
  priceFinal,
  receiptBreakdown,
  type PickedLine,
} from "./internal/price-final";
export type {
  AppliedVoucher,
  PriceContext,
  PricedCart,
  PricedLine,
  PriceLine,
  ZoneFees,
} from "./internal/price-cart";
export { spreadDiscount, voucherDiscount } from "./internal/discounts";
export type { VoucherTerms } from "./internal/discounts";
export { promotedPrice } from "./internal/promotion-price";
export type { PromotedPrice, PromotionRule } from "./internal/promotion-price";
export {
  activePromotions,
  deletePromotion,
  getPromotionForAdmin,
  listPromotionsForAdmin,
  savePromotion,
} from "./internal/promotions";
export type { PromotionInput } from "./internal/promotions";
export {
  checkVoucher,
  createCreditVoucher,
  createRewardVoucher,
  getVoucherForAdmin,
  listCustomerVouchers,
  listVouchersForAdmin,
  normalizeCode,
  redeemVoucher,
  REFERRAL_REWARD_CENTS,
  saveVoucher,
} from "./internal/vouchers";
export type {
  VoucherCheck,
  VoucherInput,
  VoucherRefusal,
} from "./internal/vouchers";
