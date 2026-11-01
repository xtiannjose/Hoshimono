import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import type { UnitPrice } from "@/modules/catalog";
import { formatMoney, moneyParts } from "@/lib/money";

import { unitPriceLabel } from "./format";

type Props = {
  priceCents: number;
  compareAtCents: number | null;
  unitPrice: UnitPrice | null;
  isWeighed: boolean;
  muted?: boolean;
  /** Product page shows the full amount at one size. */
  size?: "card" | "page";
  lang: Lang;
};

/** Price, compare-at strikethrough and Unit Price, always together (design principle 2). */
export function PriceTag({
  priceCents,
  compareAtCents,
  unitPrice,
  isWeighed,
  muted = false,
  size = "card",
  lang,
}: Props) {
  const t = MESSAGES[lang].product;
  const onSale = compareAtCents !== null && compareAtCents > priceCents;
  const { whole, fraction } = moneyParts(priceCents);
  const colour = muted ? "text-muted-foreground" : onSale ? "text-sale" : "";
  return (
    <div>
      <p
        className={`font-display font-semibold tracking-[-0.02em] tabular-nums ${
          size === "page"
            ? "text-[40px] leading-[42px]"
            : "text-[21px] leading-6"
        } ${colour}`}
      >
        {isWeighed && <span className="sr-only">{t.about}</span>}
        {size === "page" ? (
          formatMoney(priceCents)
        ) : (
          <>
            {whole}
            <span className="text-[0.66em] tracking-normal">{fraction}</span>
          </>
        )}
        {onSale && (
          <s className="text-muted-foreground text-fine ml-1.5 font-sans font-medium tracking-normal">
            <span className="sr-only">{t.was}</span>
            {formatMoney(compareAtCents)}
          </s>
        )}
      </p>
      {unitPrice && (
        <p className="text-muted-foreground text-xs leading-4 tabular-nums">
          {unitPriceLabel(unitPrice, lang)}
        </p>
      )}
    </div>
  );
}
