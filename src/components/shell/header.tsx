import { UserIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Suspense } from "react";

import { CartButton } from "@/components/cart/cart-button";
import { BrandLogo } from "@/components/shell/brand-logo";
import { CartSlot } from "@/components/shell/cart-slot";
import { CategoryNav } from "@/components/shell/category-nav";
import {
  DeliveryButton,
  DeliverySlot,
} from "@/components/shell/delivery-button";
import { SearchBox } from "@/components/shell/search-box";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { z } from "@/config/z";

export function Header() {
  return (
    <>
      <header
        style={{ zIndex: z.header }}
        className="border-border bg-bg/90 sticky top-0 border-b backdrop-blur-md backdrop-saturate-150 motion-reduce:backdrop-blur-none md:border-b-0 print:hidden"
      >
        {/* One SearchBox: its own row on phones, between logo and actions
            on wider screens, so it hydrates once. */}
        <div className="wrap grid grid-cols-[auto_1fr] grid-rows-[72px_auto] items-center gap-x-4 md:grid-cols-[auto_minmax(0,560px)_1fr] md:grid-rows-[72px]">
          <BrandLogo />
          <SearchBox
            id="q"
            className="col-span-2 row-start-2 mb-3 md:col-span-1 md:col-start-2 md:row-start-1 md:mb-0"
          />
          <div className="col-start-2 row-start-1 flex items-center gap-1 justify-self-end sm:gap-2 md:col-start-3">
            <Suspense fallback={<DeliveryButton />}>
              <DeliverySlot />
            </Suspense>
            <Link
              href="/account"
              aria-label="Account"
              className="rounded-pill hover:bg-muted grid size-11 place-items-center"
            >
              <UserIcon size={24} aria-hidden />
            </Link>
            <ThemeToggle />
            <Suspense fallback={<CartButton />}>
              <CartSlot />
            </Suspense>
          </div>
        </div>
      </header>
      {/* One CategoryNav: scrolls away under the header on phones, and from
          md up sticks below the 72 px top row, styled as part of the header. */}
      {/* Below the header (z.header), so search suggestions open over it. */}
      <div
        style={{ zIndex: z.sticky }}
        className="md:border-border md:bg-bg/90 md:sticky md:top-18 md:border-b md:backdrop-blur-md md:backdrop-saturate-150 md:motion-reduce:backdrop-blur-none print:hidden"
      >
        <Suspense fallback={<div className="h-16 md:h-12" />}>
          <CategoryNav />
        </Suspense>
      </div>
    </>
  );
}
