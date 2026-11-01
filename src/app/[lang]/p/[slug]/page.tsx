import { TruckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import {
  categoryPaths,
  categoryTree,
  product as loadProduct,
  productList,
  relatedProducts,
  stockStates,
} from "@/app/_data/storefront";
import { Breadcrumb } from "@/components/breadcrumb";
import { CountStep } from "@/components/count-step";
import { DeliveryLine } from "@/components/home/delivery-strip";
import { ProductBuy } from "@/components/product/product-buy";
import { CategoryIcon } from "@/components/product/category-icon";
import { formatPackSize } from "@/components/product/format";
import { PriceTag } from "@/components/product/price-tag";
import {
  ProductGrid,
  ProductGridSkeleton,
} from "@/components/product/product-grid";
import { StockBadge } from "@/components/product/stock-badge";
import { localPath, type Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import { getLang } from "@/i18n/server";
import type { ProductDetail } from "@/modules/catalog";
import type { StockState } from "@/modules/inventory";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import { categoryHref, productHref } from "@/lib/routes";
import { isUuid } from "@/lib/uuid";
import { Skeleton } from "@/components/ui/skeleton";

import { SaveToListSlot, StockAlertSlot } from "./customer-slots";

type Props = PageProps<"/[lang]/p/[slug]">;

// Product URLs end in the id: /p/<slug>-<36-character id>.
const idFrom = (slug: string) => {
  const id = slug.slice(-36);
  return isUuid(id) ? id : "";
};

// The shell reads params, so the generic [slug] fallback shell is empty:
// a Product not prerendered renders on its first visit (blocking). Without
// this, Next errors regenerating that shell after a catalog updateTag.
export const instant = false;

// Prerender the first page of the catalogue; the rest render on first visit.
export async function generateStaticParams() {
  const list = await productList({ limit: 96 });
  const params = (list?.items ?? []).map((p) => ({
    slug: `${p.slug}-${p.id}`,
  }));
  // At least one param is required; an empty catalogue renders not found.
  return params.length > 0 ? params : [{ slug: "__placeholder__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await loadProduct(idFrom((await params).slug));
  const lang = await getLang();
  const t = MESSAGES[lang].productPage;
  if (!found) return { title: t.notFound };
  const name = productName(found);
  return {
    title: name,
    description:
      found.description ??
      t.description(
        name,
        formatPackSize(found.packSize, found.isWeighed, lang),
        formatMoney(found.priceCents)
      ),
    alternates: { canonical: localPath(lang, productHref(found)) },
    // A real photo makes the best share card; otherwise the site default.
    ...(found.primaryImage && {
      openGraph: {
        type: "website",
        images: [
          {
            url: found.primaryImage.url,
            width: 1200,
            height: 1200,
            alt: found.primaryImage.alt,
          },
        ],
      },
    }),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const lang = await getLang();
  const found = await loadProduct(idFrom(slug));
  // A live Product renders in the page shell, not behind a Suspense
  // skeleton: streamed content is revealed by script, which held back the
  // name and photo (LCP) on slow phones.
  if (found && slug === `${found.slug}-${found.id}`)
    return (
      <div className="wrap">
        <ProductView found={found} lang={lang} />
      </div>
    );
  return (
    <div className="wrap">
      <Suspense fallback={<ProductSkeleton lang={lang} />}>
        <NotHere found={found} lang={lang} />
      </Suspense>
    </div>
  );
}

// shortcut: inside Suspense, so a missing Product streams a noindex
// not-found page with status 200. Next 16 bails out of on-demand renders
// that call notFound() in the page shell, so the check cannot move up.
function NotHere({
  found,
  lang,
}: {
  found: ProductDetail | null;
  lang: Lang;
}): never {
  // The id resolves the Product; a stale slug redirects to the current one.
  if (found) permanentRedirect(localPath(lang, productHref(found)));
  notFound();
}

async function ProductView({
  found,
  lang,
}: {
  found: ProductDetail;
  lang: Lang;
}) {
  const t = MESSAGES[lang].productPage;
  const [stock, paths] = await Promise.all([
    stockStates([found.id]),
    categoryTree().then(categoryPaths),
  ]);
  const state = stock[found.id] ?? "out";
  const crumbs = found.breadcrumb.map((c) => ({
    name: c.name,
    href: categoryHref(paths.get(c.slug) ?? [c.slug]),
  }));
  const size = formatPackSize(found.packSize, found.isWeighed, lang);

  return (
    <>
      <StructuredData product={found} stock={state} crumbs={crumbs} />
      <CountStep step="product_viewed" />
      <Breadcrumb
        items={[...crumbs, { name: found.name, href: productHref(found) }]}
      />

      <div className="grid items-start gap-8 pt-2 lg:grid-cols-[7fr_5fr] lg:gap-10">
        <div
          // Without a photo the tile stays short on phones, so the name, price
          // and Add show first (ADR 0018).
          className={`rounded-card photo-slot relative ${found.primaryImage ? "aspect-square" : "aspect-[2/1] sm:aspect-[4/3] lg:aspect-square"} ${state === "out" ? "opacity-60 grayscale" : ""}`}
        >
          {found.primaryImage ? (
            <Image
              src={found.primaryImage.url}
              alt={found.primaryImage.alt || found.name}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="rounded-card object-cover"
            />
          ) : (
            <CategoryIcon
              slug={found.category.topSlug}
              size={72}
              className="opacity-70"
            />
          )}
        </div>

        <div className="rounded-card border-border bg-card lg:top-sticky grid gap-[22px] border p-6 md:p-7 lg:sticky">
          <div>
            {found.brand && (
              <p className="text-muted-foreground text-sm font-semibold">
                {found.brand}
              </p>
            )}
            <h1 className="type-h1 mt-1.5">{found.name}</h1>
            <p className="text-muted-foreground mt-2">{size}</p>
          </div>
          <div className="grid gap-2">
            <PriceTag
              size="page"
              priceCents={found.priceCents}
              compareAtCents={found.compareAtCents}
              unitPrice={found.unitPrice}
              isWeighed={found.isWeighed}
              muted={state === "out"}
              lang={lang}
            />
            {found.isWeighed && (
              <p className="text-muted-foreground text-sm">
                {t.estimatedFor(size)}
              </p>
            )}
            <div className="flex">
              <StockBadge state={state} lang={lang} showInStock />
            </div>
          </div>
          {found.isWeighed && (
            <p className="rounded-field bg-warn-soft text-warn px-4 py-3 text-sm leading-5">
              {t.byWeight(formatPackSize(found.packSize, false, lang))}
            </p>
          )}
          {state === "out" ? (
            <div className="grid gap-3">
              <p className="rounded-field bg-muted px-4 py-3 text-sm">
                {t.outToday}
              </p>
              <Suspense fallback={null}>
                <StockAlertSlot
                  productId={found.id}
                  href={localPath(lang, productHref(found))}
                />
              </Suspense>
            </div>
          ) : (
            <ProductBuy productId={found.id} name={found.name} />
          )}
          <div className="border-border flex items-start gap-3 border-t pt-4">
            <TruckIcon size={22} aria-hidden className="mt-px shrink-0" />
            <DeliveryLine lang={lang} />
          </div>
          <Suspense fallback={null}>
            <SaveToListSlot productId={found.id} />
          </Suspense>
        </div>
      </div>

      <section aria-label={t.info} className="mt-10 grid max-w-3xl gap-2">
        {found.description && (
          <Details title={t.details} open>
            {found.description}
          </Details>
        )}
        <Details title={t.ingredients}>
          {found.allergens.length > 0
            ? t.contains(found.allergens.join(", "))
            : t.noAllergens}
        </Details>
        <Details title={t.storage}>{t.storageText[found.storage]}</Details>
      </section>

      <section aria-labelledby="related-h" className="pt-14">
        <h2 id="related-h" className="type-h2 mb-5">
          {t.moreFrom(found.category.name)}
        </h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <Related id={found.id} empty={t.noSimilar} />
        </Suspense>
      </section>
    </>
  );
}

function Details({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className="rounded-card border-border bg-card border px-5 py-1"
    >
      <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
        {title}
      </summary>
      <div className="text-muted-foreground pb-4">{children}</div>
    </details>
  );
}

async function Related({ id, empty }: { id: string; empty: string }) {
  const items = await relatedProducts(id, 6);
  const stock = await stockStates(items.map((p) => p.id));
  return <ProductGrid products={items} stock={stock} empty={<p>{empty}</p>} />;
}

/** schema.org Product and BreadcrumbList for search engines (PRD CAT-6). */
function StructuredData({
  product,
  stock,
  crumbs,
}: {
  product: ProductDetail;
  stock: StockState;
  crumbs: { name: string; href: string }[];
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      ...(product.brand && {
        brand: { "@type": "Brand", name: product.brand },
      }),
      ...(product.description && { description: product.description }),
      ...(product.primaryImage && { image: [product.primaryImage.url] }),
      sku: product.id,
      offers: {
        "@type": "Offer",
        url: `${base}${productHref(product)}`,
        priceCurrency: "PHP",
        price: (product.priceCents / 100).toFixed(2),
        availability:
          stock === "out"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        ...crumbs,
        { name: product.name, href: productHref(product) },
      ].map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: `${base}${c.href}`,
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be inline; escaping "<" keeps product text from closing the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function ProductSkeleton({ lang }: { lang: Lang }) {
  return (
    <div
      aria-busy="true"
      aria-label={MESSAGES[lang].productPage.loading}
      className="pt-5"
    >
      <Skeleton className="rounded-pill h-5 w-56" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[7fr_5fr]">
        <Skeleton className="rounded-card aspect-square" />
        <Skeleton className="rounded-card h-96" />
      </div>
    </div>
  );
}
