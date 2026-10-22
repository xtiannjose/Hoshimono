import { ScalesIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "@/components/link";

import { MESSAGES } from "@/i18n/messages";
import { getLang } from "@/i18n/server";
import type { ProductSummary } from "@/modules/catalog";
import type { StockState } from "@/modules/inventory";
import { productHref } from "@/lib/routes";
import { Skeleton } from "@/components/ui/skeleton";

import { AddToCart } from "./add-to-cart";
import { CategoryIcon } from "./category-icon";
import { formatPackSize, salePercent } from "./format";
import { PriceTag } from "./price-tag";
import { StockBadge } from "./stock-badge";
import { Tag } from "./tag";

/**
 * Square image, tags, name (2 lines max), pack size, PriceTag, then the Add
 * pill (docs/05-DESIGN-SYSTEM.md section 6). Out of stock: greyed image,
 * "Out of stock today" and no Add.
 */
export async function ProductCard({
  product,
  stock,
  priority = false,
}: {
  product: ProductSummary;
  stock: StockState;
  priority?: boolean;
}) {
  const lang = await getLang();
  const t = MESSAGES[lang].product;
  const href = productHref(product);
  const out = stock === "out";
  const save = salePercent(product.priceCents, product.compareAtCents);
  return (
    <article className="rounded-card border-border bg-card hover:border-border-strong grid grid-rows-[auto_1fr_auto] gap-3 border p-2.5 pb-3 transition-colors">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className={`rounded-field photo-slot relative aspect-square ${out ? "opacity-60 grayscale" : ""}`}
      >
        {product.primaryImage ? (
          <Image
            src={product.primaryImage.url}
            alt=""
            fill
            sizes="(min-width: 1280px) 200px, (min-width: 768px) 25vw, 50vw"
            priority={priority}
            className="rounded-field object-cover"
          />
        ) : (
          <CategoryIcon slug={product.category.slug} className="opacity-70" />
        )}
      </Link>
      <div className="grid content-start gap-1 px-1">
        <div className="flex flex-wrap gap-1.5 empty:hidden">
          {save !== null && <Tag tone="sale">{t.save(save)}</Tag>}
          <StockBadge state={stock} lang={lang} />
          {product.isWeighed && (
            <Tag tone="quiet">
              <ScalesIcon size={14} aria-hidden />
              {t.byWeight}
            </Tag>
          )}
        </div>
        <Link
          href={href}
          className="line-clamp-2 text-[15px] leading-5 font-semibold hover:underline"
        >
          {product.brand && <span className="sr-only">{product.brand} </span>}
          {product.name}
        </Link>
        <span className="text-muted-foreground text-[13px] leading-[18px]">
          {formatPackSize(product.packSize, product.isWeighed, lang)}
        </span>
      </div>
      <div className="grid gap-2.5 px-0.5">
        <PriceTag
          priceCents={product.priceCents}
          compareAtCents={product.compareAtCents}
          unitPrice={product.unitPrice}
          isWeighed={product.isWeighed}
          muted={out}
          lang={lang}
        />
        {out ? null : <AddToCart productId={product.id} name={product.name} />}
      </div>
    </article>
  );
}

/** Shaped like the card so nothing jumps when it loads (no spinners). */
export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="rounded-card border-border bg-card grid gap-3 border p-2.5 pb-3"
    >
      <Skeleton className="rounded-field aspect-square" />
      <div className="grid gap-2 px-1">
        <Skeleton className="rounded-pill h-4 w-4/5" />
        <Skeleton className="rounded-pill h-3 w-1/3" />
      </div>
      <div className="grid gap-2.5 px-0.5">
        <Skeleton className="rounded-pill h-6 w-1/2" />
        <Skeleton className="rounded-pill h-11" />
      </div>
    </div>
  );
}
