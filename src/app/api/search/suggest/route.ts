import {
  categoryPaths,
  categoryTree,
  searchSuggestions,
} from "@/app/_data/storefront";
import { formatMoney } from "@/lib/money";
import { categoryHref, productHref, searchHref } from "@/lib/routes";

export type Suggestion = {
  kind: "product" | "category" | "brand";
  label: string;
  detail?: string;
  href: string;
};

// As-you-type suggestions for the header search box (PRD CAT-3).
// shortcut: no rate limit yet; the shared limiter arrives in Batch 2.6.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  if (q.trim().length < 2) return Response.json({ suggestions: [] });
  const [found, tree] = await Promise.all([
    searchSuggestions(q),
    categoryTree(),
  ]);
  const paths = categoryPaths(tree);
  const suggestions: Suggestion[] = [
    ...found.products.map((p) => ({
      kind: "product" as const,
      label: p.brand ? `${p.brand} ${p.name}` : p.name,
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
