import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";

import { CategoryRow } from "@/components/home/category-row";
import { BuyAgain } from "@/components/home/buy-again";
import { DeliveryStrip } from "@/components/home/delivery-strip";
import {
  FeaturedRecipe,
  FeaturedRecipeSkeleton,
} from "@/components/home/featured-recipe";
import { FreshPicks } from "@/components/home/fresh-picks";
import { OnSale } from "@/components/home/on-sale";
import Link from "@/components/link";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { FRESH_PICKS_CATEGORY } from "@/config/home";
import { localPath } from "@/i18n/lang";
import { getLang, getMessages } from "@/i18n/server";
import { categoryHref } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  return {
    description: (await getMessages()).home.description,
    alternates: { canonical: localPath(await getLang(), "/") },
  };
}

const SECTION_LINK =
  "inline-flex min-h-11 items-center gap-1.5 font-semibold underline decoration-border-strong decoration-[1.5px] underline-offset-4 hover:decoration-current";

// Home opens on the shop (ADR 0018): where and when we deliver, the
// Categories, then Products. No hero: the shopper came to buy groceries.
export default async function Home() {
  const lang = await getLang();
  const t = (await getMessages()).home;
  return (
    <>
      <DeliveryStrip lang={lang} />

      <div className="wrap pt-6">
        <h1 className="type-h2">{t.title}</h1>
      </div>
      <CategoryRow lang={lang} />

      {/* Signed-in Customers only; nothing to hold space for otherwise. */}
      <Suspense fallback={null}>
        <BuyAgain />
      </Suspense>

      <section aria-labelledby="fresh-h" className="wrap pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4">
          <h2 id="fresh-h" className="type-h2">
            {t.freshPicks}
          </h2>
          <Link
            href={categoryHref([FRESH_PICKS_CATEGORY])}
            className={SECTION_LINK}
          >
            {t.seeAllFresh} <ArrowRightIcon size={18} aria-hidden />
          </Link>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <FreshPicks />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <OnSale />
      </Suspense>

      <Suspense fallback={<FeaturedRecipeSkeleton />}>
        <FeaturedRecipe />
      </Suspense>
    </>
  );
}
