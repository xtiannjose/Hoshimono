import type { StockState } from "@/modules/inventory";

import { Tag } from "./tag";

/** "In stock", "Only a few left" or "Out of stock today"; never the count. */
export function StockBadge({
  state,
  showInStock = false,
}: {
  state: StockState;
  showInStock?: boolean;
}) {
  if (state === "out") return <Tag tone="quiet">Out of stock today</Tag>;
  if (state === "low") return <Tag tone="warn">Only a few left</Tag>;
  return showInStock ? <Tag tone="soft">In stock</Tag> : null;
}
