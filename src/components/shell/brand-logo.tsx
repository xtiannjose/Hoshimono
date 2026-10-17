import Link from "next/link";

import { brand } from "@/config/brand";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display inline-flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.05em] ${className ?? ""}`}
    >
      <span
        aria-hidden
        className="rounded-pill bg-accent text-on-accent grid size-9 place-items-center pb-[3px] text-[22px] tracking-normal"
      >
        {brand.mark}
      </span>
      {brand.wordmark}
    </Link>
  );
}
