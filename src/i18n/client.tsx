"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

import { localPath, stripLang, type Lang } from "./lang";
import { MESSAGES, type Messages } from "./messages";

// The page's language for Client Components (ADR 0017). Both dictionaries
// are small, so the browser gets them as code rather than per page.

const LangContext = createContext<Lang>("en");

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return <LangContext value={lang}>{children}</LangContext>;
}

export const useLang = () => useContext(LangContext);

export const useMessages = (): Messages => MESSAGES[useLang()];

/** A shop address in the page's language. */
export function useLocalPath(): (path: string) => string {
  const lang = useLang();
  return (path) => localPath(lang, path);
}

/**
 * The page's address without its language: "/c/milk" on /fil/c/milk. A
 * prerendered English page is rendered as /en/c/milk and opened as /c/milk;
 * stripping both keeps server and browser markup the same.
 */
export const useShopPath = () => stripLang(usePathname());
