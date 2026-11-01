import { NextResponse, type NextRequest } from "next/server";

import { HTML_LANG, LANGS, localPath, stripLang } from "@/i18n/lang";

// Files at the site root (the favicon, robots, the sitemap, the manifest,
// the service worker, icons). A dot deeper down is part of a page address:
// signed stop links carry one.
const ROOT_FILE = /^\/[^/]+\.(?:ico|js|png|svg|txt|webmanifest|xml)$/;

/** Both versions of the page for search engines (hreflang), as a header. */
function alternates(request: NextRequest): string {
  const { origin, pathname } = request.nextUrl;
  const path = stripLang(pathname);
  return [
    ...LANGS.map(
      (lang) =>
        `<${origin}${localPath(lang, path)}>; rel="alternate"; hreflang="${HTML_LANG[lang]}"`
    ),
    `<${origin}${path}>; rel="alternate"; hreflang="x-default"`,
  ].join(", ");
}

// Languages in the address (ADR 0017): Filipino pages live under /fil;
// English keeps addresses without a prefix and is served from /en inside.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (ROOT_FILE.test(pathname)) return;
  const url = request.nextUrl.clone();
  // One address per page: /en/cart is /cart.
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }
  let response: NextResponse;
  if (pathname === "/fil" || pathname.startsWith("/fil/")) {
    response = NextResponse.next();
  } else {
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    response = NextResponse.rewrite(url);
  }
  response.headers.set("Link", alternates(request));
  return response;
}

export const config = {
  // Not staff screens, the API, uploaded media, the app icons or Next's own files.
  matcher: ["/((?!(?:api|admin|_next|media|icon)(?:/|$)|__next).*)"],
};
