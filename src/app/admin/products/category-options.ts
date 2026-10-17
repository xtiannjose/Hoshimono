import { listCategoriesForAdmin } from "@/modules/catalog";

/** Every Category as "Parent > Child", in tree order, for a select. */
export async function categoryOptions() {
  const rows = await listCategoriesForAdmin();
  const byParent = new Map<string | null, typeof rows>();
  for (const r of rows) {
    const list = byParent.get(r.parentId) ?? [];
    list.push(r);
    byParent.set(r.parentId, list);
  }
  const options: { value: string; label: string; slug: string }[] = [];
  const walk = (parent: string | null, prefix: string) => {
    for (const r of byParent.get(parent) ?? []) {
      const label = prefix ? `${prefix} > ${r.name}` : r.name;
      options.push({ value: r.id, label, slug: r.slug });
      walk(r.id, label);
    }
  };
  walk(null, "");
  return options;
}
