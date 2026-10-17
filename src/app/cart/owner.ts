import { cookies } from "next/headers";

import {
  isGuestToken,
  mergeGuestCart,
  newGuestToken,
  type CartContext,
  type CartOwner,
} from "@/modules/cart";
import { getDefaultAddress } from "@/modules/customers";
import { getDefaultHubId, resolveZone } from "@/modules/delivery";
import { currentCustomer } from "@/modules/identity";

// The guest Cart cookie holds a random token; the database keeps only its
// hash (docs/03-ARCHITECTURE.md section 5).
const GUEST_COOKIE = "hm_cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Who owns the Cart on this request, or null for a guest with no Cart yet. */
export async function readCartOwner(): Promise<CartOwner | null> {
  const [customer, jar] = await Promise.all([currentCustomer(), cookies()]);
  const token = jar.get(GUEST_COOKIE)?.value;
  if (customer) {
    // Merge on the first request after sign-in. Idempotent, so a page render
    // may run it; actions also clear the cookie (pages cannot set cookies).
    if (isGuestToken(token)) {
      await mergeGuestCart(token, customer.id, await getDefaultHubId());
    }
    return { customerId: customer.id };
  }
  return isGuestToken(token) ? { guestToken: token } : null;
}

/** For Server Actions: like readCartOwner, but starts a guest Cart if needed. */
export async function writeCartOwner(): Promise<CartOwner> {
  const owner = await readCartOwner();
  const jar = await cookies();
  if (owner && "customerId" in owner) {
    if (jar.has(GUEST_COOKIE)) jar.delete(GUEST_COOKIE);
    return owner;
  }
  const guestToken = owner?.guestToken ?? newGuestToken();
  // Refreshed on every write, so an active guest Cart does not expire.
  jar.set(GUEST_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
  return { guestToken };
}

/**
 * Hub and Zone for pricing and stock: the Zone of a signed-in Customer's
 * default address, else the default Hub with delivery shown "at checkout".
 */
export async function cartContext(
  owner: CartOwner | null
): Promise<CartContext> {
  const address =
    owner && "customerId" in owner
      ? await getDefaultAddress(owner.customerId)
      : null;
  const zone = address ? await resolveZone(address) : null;
  if (zone) return { hubId: zone.hubId, zone: zone.fees };
  return { hubId: await getDefaultHubId(), zone: null };
}
