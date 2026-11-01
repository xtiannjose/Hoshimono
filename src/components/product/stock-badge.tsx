import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import type { StockState } from "@/modules/inventory";

import { Tag } from "./tag";

/** "In stock", "Only a few left" or "Out of stock today"; never the count. */
export function StockBadge({
  state,
  lang,
  showInStock = false,
}: {
  state: StockState;
  lang: Lang;
  showInStock?: boolean;
}) {
  const t = MESSAGES[lang].product;
  if (state === "out") return <Tag tone="quiet">{t.out}</Tag>;
  if (state === "low") return <Tag tone="warn">{t.low}</Tag>;
  return showInStock ? <Tag tone="soft">{t.inStock}</Tag> : null;
}
