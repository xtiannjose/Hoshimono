import { db } from "@/lib/db";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  children: CategoryNode[];
};

export type CategoryDetail = CategoryNode & {
  /** Root first, excluding this Category. */
  ancestors: { slug: string; name: string }[];
};

type Row = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  imageUrl: string | null;
};

async function loadAll(): Promise<Row[]> {
  return db.category.findMany({
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      imageUrl: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

function build(rows: Row[]) {
  const nodes = new Map<string, CategoryNode & { parentId: string | null }>();
  for (const r of rows) nodes.set(r.id, { ...r, children: [] });
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return { nodes, roots };
}

function strip(node: CategoryNode): CategoryNode {
  return {
    id: node.id,
    slug: node.slug,
    name: node.name,
    imageUrl: node.imageUrl,
    children: node.children.map(strip),
  };
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return build(await loadAll()).roots.map(strip);
}

export async function getCategory(
  slug: string
): Promise<CategoryDetail | null> {
  const { nodes } = build(await loadAll());
  const node = [...nodes.values()].find((n) => n.slug === slug);
  if (!node) return null;
  const ancestors: { slug: string; name: string }[] = [];
  for (
    let p = node.parentId && nodes.get(node.parentId);
    p;
    p = p.parentId && nodes.get(p.parentId)
  ) {
    ancestors.unshift({ slug: p.slug, name: p.name });
  }
  return { ...strip(node), ancestors };
}

/** The Category and every Category below it. */
export async function categoryAndDescendantIds(
  slug: string
): Promise<string[] | null> {
  const { nodes } = build(await loadAll());
  const root = [...nodes.values()].find((n) => n.slug === slug);
  if (!root) return null;
  const ids: string[] = [];
  const walk = (n: CategoryNode) => {
    ids.push(n.id);
    n.children.forEach(walk);
  };
  walk(root);
  return ids;
}
