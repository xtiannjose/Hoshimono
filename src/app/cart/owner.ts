import { cookies, headers } from "next/headers";

import { clientIp, takeToken } from "@/lib/rate-limit";
import {
  hasGuestCart,
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
// New guest Carts per IP per hour; generous for shared carrier IPs.
const NEW_CARTS_PER_HOUR = 60;

/**
 * Who owns the Cart on this request, or null for a guest with no Cart yet.
 * Not memoised: an action may set the guest cookie and then re-render the
 * page in the same request, and that render must read the cookie again.
 */
export async function readCartOwner(): Promise<CartOwner | null> {
  const [customer, jar] = await Promise.all([currentCustomer(), cookies()]);
  const token = jar.get(GUEST_COOKIE)?.value;
  if (customer) {
    const owner = { customerId: customer.id };
    // Merge on the first request after sign-in. The cookie lingers until a
    // Server Action clears it (pages cannot), so check cheaply first.
    if (isGuestToken(token) && (await hasGuestCart(token))) {
      await mergeGuestCart(
        token,
        customer.id,
        (await cartContext(owner)).hubId
      );
    }
    return owner;
  }
  return isGuestToken(token) ? { guestToken: token } : null;
}

/**
 * For Server Actions: like readCartOwner, but starts a guest Cart if
 * needed. Null when this IP has started too many Carts in the last hour.
 */
export async function writeCartOwner(): Promise<CartOwner | null> {
  const owner = await readCartOwner();
  const jar = await cookies();
  if (owner && "customerId" in owner) {
    if (jar.has(GUEST_COOKIE)) jar.delete(GUEST_COOKIE);
    return owner;
  }
  if (owner) return owner;
  const limit = await takeToken(
    `cart:new:ip:${clientIp(await headers())}`,
    NEW_CARTS_PER_HOUR,
    60 * 60
  );
  if (!limit.ok) return null;
  // Set only when new: setting a cookie in an action re-renders the page.
  // Idle guest Carts are purged after 30 days (cron tick), like the cookie.
  const guestToken = newGuestToken();
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
