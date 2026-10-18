import { UserIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Suspense } from "react";

import { BrandLogo } from "@/components/shell/brand-logo";
import { CategoryNav } from "@/components/shell/category-nav";
import { DeliveryButton } from "@/components/shell/delivery-button";
import { SearchBox } from "@/components/shell/search-box";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { z } from "@/config/z";

export function Header() {
  return (
    <>
      <header
        style={{ zIndex: z.header }}
        className="border-border bg-bg/90 sticky top-0 border-b backdrop-blur-md backdrop-saturate-150 motion-reduce:backdrop-blur-none"
      >
        <div className="wrap flex h-[72px] items-center gap-4">
          <BrandLogo />
          <SearchBox id="q" className="hidden max-w-[560px] flex-1 md:flex" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <DeliveryButton />
            <Link
              href="/account"
              aria-label="Account"
              className="rounded-pill hover:bg-muted grid size-11 place-items-center"
            >
              <UserIcon size={24} aria-hidden />
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="wrap pb-3 md:hidden">
          <SearchBox id="q-mobile" />
        </div>
        <div className="hidden md:block">
          <Suspense fallback={<div className="h-12" />}>
            <CategoryNav variant="tabs" />
          </Suspense>
        </div>
      </header>
      <div className="md:hidden">
        <Suspense fallback={<div className="h-16" />}>
          <CategoryNav variant="chips" />
        </Suspense>
      </div>
    </>
  );
}
