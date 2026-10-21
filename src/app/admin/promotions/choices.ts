import "server-only";

import { getCategoryTree } from "@/modules/catalog";

/** Top-level Categories with their sub-Categories, for the Promotion form. */
export async function categoryChoices() {
  return (await getCategoryTree()).map((c) => ({
    id: c.id,
    name: c.name,
    children: c.children.map((s) => ({ id: s.id, name: s.name })),
  }));
}
