import { Suspense } from "react";

import Link from "@/components/link";
import { BrandLogo } from "@/components/shell/brand-logo";
import { InstallButton } from "@/components/shell/installable";
import {
  LanguageLink,
  LanguageSwitch,
} from "@/components/shell/language-switch";
import { brand } from "@/config/brand";
import type { Lang } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";

const LINK = "inline-flex min-h-11 items-center font-semibold hover:underline";

export function Footer({ lang }: { lang: Lang }) {
  const t = MESSAGES[lang].shell;
  return (
    // Room below the last links for the phone's floating Cart bar.
    <footer className="bg-surface-2 mt-24 print:hidden max-md:[body:has([data-cart-bar])_&]:pb-[calc(88px+env(safe-area-inset-bottom))]">
      <div className="wrap flex flex-col gap-3 py-10">
        <BrandLogo className="text-[22px]" />
        <p className="type-small text-muted-foreground max-w-[44ch]">
          {t.about}
        </p>
        <nav
          aria-label={t.moreFrom(brand.name)}
          className="flex flex-wrap gap-x-6"
        >
          <Link href="/recipes" className={LINK}>
            {t.recipes}
          </Link>
          <Link href="/articles" className={LINK}>
            {t.tipsAndGuides}
          </Link>
          <Suspense fallback={<LanguageLink long className={LINK} />}>
            <LanguageSwitch long className={LINK} />
          </Suspense>
          <InstallButton className={LINK} />
        </nav>
      </div>
    </footer>
  );
}
