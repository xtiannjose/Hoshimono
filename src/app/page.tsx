import { ArrowRightIcon, BasketIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  CategoryMosaic,
  CategoryMosaicSkeleton,
} from "@/components/home/category-mosaic";
import { FreshPicks } from "@/components/home/fresh-picks";
import { ServiceStrip } from "@/components/home/service-strip";
import { ProductGridSkeleton } from "@/components/product/product-grid";
import { buttonVariants } from "@/components/ui/button";
import { FRESH_PICKS_CATEGORY } from "@/config/home";
import { categoryHref } from "@/lib/routes";

export const metadata: Metadata = {
  description:
    "Fresh groceries delivered the same day across Metro Manila. Pick a 2-hour delivery slot and pay cash on delivery.",
  alternates: { canonical: "/" },
};

const SECTION_LINK =
  "inline-flex min-h-11 items-center gap-1.5 font-semibold underline decoration-border-strong decoration-[1.5px] underline-offset-4 hover:decoration-current";

// Home v1 (docs/mockup-v2/home.html): hero, service strip, Category mosaic
// and fresh picks. Recipes and savings arrive with Phase 5.
export default function Home() {
  return (
    <>
      <section
        aria-labelledby="hero-h"
        className="wrap grid items-center gap-6 pt-8 md:pt-10 lg:grid-cols-12"
      >
        <div className="grid content-center gap-[22px] lg:col-span-6 lg:pr-6">
          <h1 id="hero-h" className="type-display">
            Fresh groceries, delivered <span className="hl">today.</span>
          </h1>
          <p className="type-lead">
            Pick a 2-hour delivery slot, then pay the Rider in cash when your
            order arrives.
          </p>
          <div>
            <Link
              href={categoryHref([FRESH_PICKS_CATEGORY])}
              className={buttonVariants({ size: "lg" })}
            >
              Start shopping
            </Link>
          </div>
        </div>
        {/* Phones skip the photo so Products appear above the fold (mockup decision 5). */}
        <div
          aria-hidden
          className="rounded-card photo-slot relative hidden aspect-[5/4] lg:col-span-6 lg:grid"
        >
          <BasketIcon size={48} className="opacity-70" aria-hidden />
        </div>
      </section>

      <div className="wrap">
        <ServiceStrip />
      </div>

      <section aria-labelledby="cat-h" className="wrap pt-14">
        <h2 id="cat-h" className="type-h2 mb-5">
          Shop by category
        </h2>
        <Suspense fallback={<CategoryMosaicSkeleton />}>
          <CategoryMosaic />
        </Suspense>
      </section>

      <section aria-labelledby="fresh-h" className="wrap pt-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4">
          <h2 id="fresh-h" className="type-h2">
            Fresh picks today
          </h2>
          <Link
            href={categoryHref([FRESH_PICKS_CATEGORY])}
            className={SECTION_LINK}
          >
            See all fruit and vegetables{" "}
            <ArrowRightIcon size={18} aria-hidden />
          </Link>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <FreshPicks />
        </Suspense>
      </section>
    </>
  );
}
