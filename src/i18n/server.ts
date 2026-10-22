import "server-only";

import { lang as rootLang } from "next/root-params";

import { DEFAULT_LANG, isLang, type Lang } from "./lang";
import { MESSAGES, type Messages } from "./messages";

/** The page's language, from the /[lang] root segment (ADR 0017). */
export async function getLang(): Promise<Lang> {
  const value = await rootLang();
  return isLang(value) ? value : DEFAULT_LANG;
}

/** The words for the page's language, in a Server Component. */
export async function getMessages(): Promise<Messages> {
  return MESSAGES[await getLang()];
}
