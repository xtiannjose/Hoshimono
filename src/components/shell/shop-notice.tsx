import { connection } from "next/server";

import { getShopNotice } from "@/modules/delivery";

/**
 * A notice staff set for the whole shop, such as a closure for a typhoon
 * (docs/runbook.md, 3). Read on each request, so it shows and goes at once.
 */
export async function ShopNotice() {
  await connection();
  const notice = await getShopNotice();
  if (!notice) return null;
  return (
    <p
      role="status"
      className="bg-warn-soft text-warn px-4 py-2.5 text-center text-sm font-semibold"
    >
      {notice}
    </p>
  );
}
