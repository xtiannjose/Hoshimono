// Public interface of the cart module (docs/03-ARCHITECTURE.md section 3).
// Owns Cart and CartLine. Totals come from pricing.priceCart.
export {
  checkOutCart,
  getCart,
  getCartId,
  getCartQuantities,
  hasGuestCart,
  isGuestToken,
  MAX_NOTE_LENGTH,
  mergeGuestCart,
  newGuestToken,
  readCartVersion,
  setLineNote,
  setLineQuantity,
  setSubstitution,
} from "./internal/cart";
export type {
  CartContext,
  CartLineView,
  CartOwner,
  CartView,
  SetQuantityResult,
} from "./internal/cart";
