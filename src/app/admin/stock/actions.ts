"use server";

import { refresh, updateTag } from "next/cache";

import { STOCK_TAG } from "@/app/_data/storefront";
import { getDefaultHubId } from "@/modules/delivery";
import { recordAudits, requireStaff } from "@/modules/identity";
import {
  countStock,
  receiveStock,
  recordShrink,
  setLowStockThreshold,
} from "@/modules/inventory";

export type StockFormState = {
  errors: Record<string, string>;
  saved?: boolean;
};

export type StockMove = "receive" | "shrink" | "count" | "threshold";

const whole = (fd: FormData, key: string) => {
  const raw = String(fd.get(key) ?? "").trim();
  return raw === "" ? Number.NaN : Number(raw);
};

/** One stock change for a Product at the Hub (ADR 0012), audited. */
export async function stockAction(
  productId: string,
  move: StockMove,
  _prev: StockFormState,
  fd: FormData
): Promise<StockFormState> {
  const staff = await requireStaff("stock", `/admin/stock/${productId}`);
  const hubId = await getDefaultHubId();
  if (!hubId) return { errors: { form: "No Hub is open." } };
  const note = String(fd.get("note") ?? "");
  const result =
    move === "receive"
      ? await receiveStock(
          hubId,
          productId,
          whole(fd, "quantity"),
          staff.id,
          note
        )
      : move === "shrink"
        ? await recordShrink(
            hubId,
            productId,
            whole(fd, "quantity"),
            staff.id,
            note
          )
        : move === "count"
          ? await countStock(
              hubId,
              productId,
              whole(fd, "counted"),
              staff.id,
              note
            )
          : await setLowStockThreshold(
              hubId,
              productId,
              whole(fd, "threshold")
            );
  if (!result.ok) return { errors: result.errors };
  await recordAudits([
    {
      staffId: staff.id,
      action: move,
      entity: "stock",
      entityId: productId,
      // The fields typed, not React's own ($ACTION_...).
      after: Object.fromEntries(
        [...fd.entries()].filter(([key]) => !key.startsWith("$"))
      ),
    },
  ]);
  // Shelves show what is free: the storefront must see the change.
  updateTag(STOCK_TAG);
  refresh();
  return { errors: {}, saved: true };
}
