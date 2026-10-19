import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

import type { WriteResult } from "./products";

const MAX_DEPTH = 3; // docs/04-DATA-MODEL.md: tree depth is capped at 3

type Node = { id: string; parentId: string | null };

async function nodes(): Promise<Map<string, Node>> {
  const rows = await db.category.findMany({
    select: { id: true, parentId: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

/** Levels from the root down to and including `id` (a root is 1). */
function depth(all: Map<string, Node>, id: string): number {
  let d = 0;
  const seen = new Set<string>();
  for (
    let n = all.get(id);
    n;
    n = n.parentId ? all.get(n.parentId) : undefined
  ) {
    if (seen.has(n.id)) break; // a corrupt cycle must not hang the request
    seen.add(n.id);
    d++;
  }
  return d;
}

/** Levels in the subtree below and including `id` (a leaf is 1). */
function height(all: Map<string, Node>, id: string): number {
  let tallest = 0;
  for (const n of all.values()) {
    if (n.parentId === id) tallest = Math.max(tallest, height(all, n.id));
  }
  return tallest + 1;
}

function isAncestorOrSelf(
  all: Map<string, Node>,
  ancestor: string,
  id: string
): boolean {
  const seen = new Set<string>();
  for (
    let n = all.get(id);
    n && !seen.has(n.id);
    n = n.parentId ? all.get(n.parentId) : undefined
  ) {
    if (n.id === ancestor) return true;
    seen.add(n.id);
  }
  return false;
}

const error = (field: string, message: string) => ({
  ok: false as const,
  errors: [{ field, message }],
});

export async function createCategory(input: {
  name: string;
  parentSlug?: string | null;
}): Promise<WriteResult<{ id: string }>> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 60)
    return error("name", "Enter a name of 2 to 60 letters");
  const slug = slugify(name);
  if (!slug) return error("name", "Use letters or numbers in the name");
  if (await db.category.findUnique({ where: { slug } })) {
    return error("name", "A Category with this name already exists");
  }
  let parentId: string | null = null;
  if (input.parentSlug) {
    const parent = await db.category.findUnique({
      where: { slug: input.parentSlug },
    });
    if (!parent) return error("parent", "Choose an existing parent Category");
    if (depth(await nodes(), parent.id) + 1 > MAX_DEPTH) {
      return error("parent", `Categories go at most ${MAX_DEPTH} levels deep`);
    }
    parentId = parent.id;
  }
  const sortOrder = await db.category.count({ where: { parentId } });
  const created = await db.category.create({
    data: { name, slug, parentId, sortOrder },
  });
  return { ok: true, id: created.id };
}

/** Rename, reorder or move a Category. The slug (and URL) stays. */
export async function updateCategory(
  id: string,
  patch: { name?: string; parentId?: string | null; sortOrder?: number }
): Promise<WriteResult> {
  const all = await nodes();
  if (!all.has(id)) return error("", "No such Category");
  const data: { name?: string; parentId?: string | null; sortOrder?: number } =
    {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name.length < 2 || name.length > 60)
      return error("name", "Enter a name of 2 to 60 letters");
    data.name = name;
  }
  if (patch.parentId !== undefined) {
    if (patch.parentId !== null) {
      if (!all.has(patch.parentId))
        return error("parent", "Choose an existing parent Category");
      if (isAncestorOrSelf(all, id, patch.parentId)) {
        return error("parent", "A Category cannot move inside itself");
      }
      if (depth(all, patch.parentId) + height(all, id) > MAX_DEPTH) {
        return error(
          "parent",
          `Categories go at most ${MAX_DEPTH} levels deep`
        );
      }
    }
    data.parentId = patch.parentId;
  }
  if (patch.sortOrder !== undefined)
    data.sortOrder = Math.max(0, Math.trunc(patch.sortOrder));
  await db.category.update({ where: { id }, data });
  return { ok: true };
}

/** Only an empty Category: no sub-Categories and no Products. */
export async function deleteCategory(id: string): Promise<WriteResult> {
  const [children, products] = await Promise.all([
    db.category.count({ where: { parentId: id } }),
    db.product.count({ where: { categoryId: id } }),
  ]);
  if (children > 0) return error("", "Move or delete its sub-Categories first");
  if (products > 0)
    return error("", `Move its ${products} Products to another Category first`);
  const deleted = await db.category.deleteMany({ where: { id } });
  return deleted.count ? { ok: true } : error("", "No such Category");
}

/** The tree with Product counts, for the editor. */
export async function listCategoriesForAdmin() {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });
  return rows.map(({ _count, ...r }) => ({
    ...r,
    productCount: _count.products,
  }));
}

/** One Category as stored, for the audit log's "before". */
export async function getCategoryForAdmin(id: string) {
  const UUID = /^[0-9a-f-]{36}$/i;
  if (!UUID.test(id)) return null;
  return db.category.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      sortOrder: true,
    },
  });
}
