"use client";

import { useSearchParams } from "next/navigation";

import { useLang, useMessages, useShopPath } from "@/i18n/client";
import { HTML_LANG, localPath } from "@/i18n/lang";

/**
 * A link to the other language (ADR 0017), named in that language. A full
 * load, since each language is its own root layout.
 */
export function LanguageLink({
  path = "/",
  long = false,
  className,
}: {
  /** The page to open, without a language. */
  path?: string;
  /** "Basahin sa Filipino" rather than "FIL". */
  long?: boolean;
  className?: string;
}) {
  const other = useLang() === "en" ? "fil" : "en";
  const words = useMessages().shell.otherLanguage;
  return (
    <a
      href={localPath(other, path)}
      hrefLang={other}
      lang={HTML_LANG[other]}
      className={className}
    >
      {long ? (
        words.long
      ) : (
        <>
          {/* The name keeps the visible "FIL" first (WCAG 2.5.3). */}
          {words.short}
          <span className="sr-only">, {words.long}</span>
        </>
      )}
    </a>
  );
}

/** The same page in the other language; reads the URL, so it sits in Suspense. */
export function LanguageSwitch(props: { long?: boolean; className?: string }) {
  const path = useShopPath();
  const query = useSearchParams().toString();
  return <LanguageLink {...props} path={query ? `${path}?${query}` : path} />;
}
