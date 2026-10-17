/** URL slug: "Jack 'n Jill Potato Chips!" becomes "jack-n-jill-potato-chips". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’!.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A Product's slug is its brand and name together. */
export function productSlug(brand: string | null, name: string): string {
  return slugify(brand ? `${brand} ${name}` : name);
}
