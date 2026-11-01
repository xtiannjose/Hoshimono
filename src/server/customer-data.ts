import { db } from "@/lib/db";
import { mediaStore } from "@/lib/media";
import { eraseCustomerCarts, shoppingListData } from "@/modules/cart";
import { claimData, eraseClaimDetails, hasOpenClaim } from "@/modules/claims";
import { customerProfileData, eraseCustomerProfile } from "@/modules/customers";
import { deleteCustomerSignIn } from "@/modules/identity";
import { eraseStockAlerts, stockAlertData } from "@/modules/inventory";
import { eraseRecipients, messageData } from "@/modules/notifications";
import { eraseOrderContacts, hasOpenOrders, orderData } from "@/modules/orders";
import { listCustomerVouchers } from "@/modules/pricing";

// A Customer's data on request (PRD section 7, ADR 0020), across the
// modules that keep a part of it, each through its own interface.

const reachedAt = (person: { email: string | null; phone: string | null }) =>
  [person.email, person.phone].filter((v): v is string => !!v);

/** Everything the shop keeps about one Customer, for them to download. */
export async function exportCustomerData(customerId: string) {
  const { profile, addresses } = await customerProfileData(customerId);
  const [orders, shoppingLists, stockAlerts, claims, vouchers, messages] =
    await Promise.all([
      orderData(customerId),
      shoppingListData(customerId),
      stockAlertData(customerId),
      claimData(customerId),
      listCustomerVouchers(customerId),
      messageData(customerId, profile ? reachedAt(profile) : []),
    ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    addresses,
    orders,
    shoppingLists,
    stockAlerts,
    claims,
    vouchers,
    messages,
  };
}

export type EraseResult =
  { ok: true } | { ok: false; reason: "open_orders" | "claim_open" };

/**
 * Deletes the account: the person goes from every module in one
 * transaction; Orders stay, without them, for the tax record. Waits until
 * no Order is on its way and no claim is waiting.
 */
export async function eraseCustomer(customerId: string): Promise<EraseResult> {
  if (await hasOpenOrders(customerId)) {
    return { ok: false, reason: "open_orders" };
  }
  if (await hasOpenClaim(customerId)) {
    return { ok: false, reason: "claim_open" };
  }
  const photos = await db.$transaction(async (tx) => {
    const person = await eraseCustomerProfile(tx, customerId);
    await eraseOrderContacts(tx, customerId);
    await eraseCustomerCarts(tx, customerId);
    await eraseStockAlerts(tx, customerId);
    await eraseRecipients(tx, customerId, reachedAt(person));
    if (person.authUserId) await deleteCustomerSignIn(tx, person.authUserId);
    return eraseClaimDetails(tx, customerId);
  });
  const media = mediaStore();
  await Promise.all(photos.map((url) => media.remove(url)));
  return { ok: true };
}
