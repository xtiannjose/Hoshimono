import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or endless: accounts, admin, API, search result pages.
      disallow: ["/admin", "/account", "/api/", "/search", "/sign-in"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
