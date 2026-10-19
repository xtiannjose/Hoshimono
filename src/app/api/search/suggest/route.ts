import {
  categoryPaths,
  categoryTree,
  searchSuggestions,
} from "@/app/_data/storefront";
import { formatMoney } from "@/lib/money";
import { productName } from "@/lib/product-name";
import { clientIp, takeToken } from "@/lib/rate-limit";
import { categoryHref, productHref, searchHref } from "@/lib/routes";

export type Suggestion = {
  kind: "product" | "category" | "brand";
  label: string;
  detail?: string;
  href: string;
};

// About two keystrokes a second per IP, generous for shared carrier IPs.
const PER_MINUTE = 120;

// As-you-type suggestions for the header search box (PRD CAT-3).
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  if (q.trim().length < 2) return Response.json({ suggestions: [] });
  const token = await takeToken(
    `suggest:ip:${clientIp(request.headers)}`,
    PER_MINUTE,
    60
  );
  if (!token.ok) {
    return Response.json(
      { suggestions: [] },
      {
        status: 429,
        headers: { "Retry-After": String(token.retryAfterSeconds) },
      }
    );
  }
  const [found, tree] = await Promise.all([
    searchSuggestions(q),
    categoryTree(),
  ]);
  const paths = categoryPaths(tree);
  const suggestions: Suggestion[] = [
    ...found.products.map((p) => ({
      kind: "product" as const,
      label: productName(p),
      detail: formatMoney(p.priceCents),
      href: productHref(p),
    })),
    ...found.categories.map((c) => ({
      kind: "category" as const,
      label: c.name,
      href: categoryHref(paths.get(c.slug) ?? [c.slug]),
    })),
    ...found.brands.map((b) => ({
      kind: "brand" as const,
      label: b,
      href: searchHref(b),
    })),
  ];
  return Response.json({ suggestions });
}
