"use client";

import { usePathname } from "next/navigation";
import { createContext, use, useContext, type ReactNode } from "react";

import { en } from "./en";
import { localPath, stripLang, type Lang } from "./lang";
import type { Messages } from "./messages";

// The page's language and its words for Client Components (ADR 0017).
// English is in the page's code; Filipino loads as its own chunk, only on
// Filipino pages, so English pages do not carry both dictionaries.

let filipino: Promise<Messages> | undefined;
const loadFilipino = () => (filipino ??= import("./fil").then((m) => m.fil));

const LangContext = createContext<Lang>("en");
const MessagesContext = createContext<Messages>(en);

export function I18nProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  const messages = lang === "fil" ? use(loadFilipino()) : en;
  return (
    <LangContext value={lang}>
      <MessagesContext value={messages}>{children}</MessagesContext>
    </LangContext>
  );
}

export const useLang = () => useContext(LangContext);

export const useMessages = (): Messages => useContext(MessagesContext);

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
