import type { ListProductsInput, ProductSort } from "@/modules/catalog";
import { parseMoney } from "@/lib/money";

export const PAGE_SIZE = 24;
const SORTS: ProductSort[] = [
  "featured",
  "price_asc",
  "price_desc",
  "unit_price_asc",
];

type Params = Record<string, string | string[] | undefined>;

const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Category page filters from the URL. Prices are typed in pesos. */
export function parseListParams(params: Params) {
  const sortParam = one(params.sort) as ProductSort | undefined;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : "featured";
  const page = Math.max(
    1,
    Math.min(1000, Number.parseInt(one(params.page) ?? "1", 10) || 1)
  );
  const min = one(params.min);
  const max = one(params.max);
  const filters: Omit<ListProductsInput, "categorySlug"> = {
    brands: many(params.brand),
    dietaryTags: many(params.diet),
    minPriceCents: min ? (parseMoney(min) ?? undefined) : undefined,
    maxPriceCents: max ? (parseMoney(max) ?? undefined) : undefined,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  return { filters, page, min: min ?? "", max: max ?? "" };
}

/** The current URL with some parameters replaced, for pagination links. */
export function withParams(
  path: string,
  params: Params,
  changes: Params
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) {
    for (const v of many(value)) query.append(key, v);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
