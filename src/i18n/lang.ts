// The shop's languages (ADR 0017). English keeps addresses without a
// prefix; Filipino pages live under /fil.

export const LANGS = ["en", "fil"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

/** The value for <html lang>. */
export const HTML_LANG: Record<Lang, string> = { en: "en-PH", fil: "fil" };

export const isLang = (value: unknown): value is Lang =>
  (LANGS as readonly unknown[]).includes(value);

/** The language a Client Component sent with a Server Action: untrusted. */
export const langOf = (value: unknown): Lang =>
  isLang(value) ? value : DEFAULT_LANG;

// Staff screens, the API and uploaded files have one address.
const NOT_SHOP = /^\/(?:admin|api|media)(?:[/?#]|$)/;

/**
 * A shop address in a language: unchanged for English, "/fil/c/milk" for
 * Filipino. Addresses outside the shop, or already in a language, pass through.
 */
export function localPath(lang: Lang, path: string): string {
  if (
    lang === DEFAULT_LANG ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    NOT_SHOP.test(path) ||
    stripLang(path) !== path
  ) {
    return path;
  }
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** The address without its language: "/fil/c/milk" is "/c/milk". */
export function stripLang(path: string): string {
  const match = /^\/(en|fil)(?=[/?#]|$)\/?/.exec(path);
  return match ? `/${path.slice(match[0].length)}` : path;
}
