// URL shapes (docs/03-ARCHITECTURE.md section 4). The id resolves a Product;
// the slug is cosmetic and redirects when stale.
export function productHref(product: { slug: string; id: string }): string {
  return `/p/${product.slug}-${product.id}`;
}

/** Category path from root to leaf, such as /c/dairy-and-eggs/milk. */
export function categoryHref(slugs: string[]): string {
  return `/c/${slugs.join("/")}`;
}

export function searchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query)}`;
}
