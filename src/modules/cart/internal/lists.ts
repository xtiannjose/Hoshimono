import { db } from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { getProductSummaries, type ProductSummary } from "@/modules/catalog";

// Shopping Lists: a Customer's named lists of Products to buy again
// (ADR 0014). Every read and write is by the owning Customer.

export const MAX_LISTS = 20;
export const MAX_LIST_ITEMS = 100;
const MAX_NAME = 60;

export type ShoppingListSummary = {
  id: string;
  name: string;
  itemCount: number;
  updatedAt: Date;
};

export type ShoppingListView = {
  id: string;
  name: string;
  /** Products still sold, in the order they were added. */
  items: { product: ProductSummary; quantity: number }[];
};

/** What is wrong with a list's name; the shop words it (ADR 0019). */
export type ListNameProblem =
  "no_name" | "name_too_long" | "name_taken" | "too_many_lists" | "list_gone";

type NameResult =
  { ok: true; id: string } | { ok: false; errors: { name: ListNameProblem } };

const owned = (customerId: string, listId: string) =>
  isUuid(listId)
    ? db.shoppingList.findFirst({
        where: { id: listId, customerId },
        select: { id: true, name: true },
      })
    : null;

export async function listShoppingLists(
  customerId: string
): Promise<ShoppingListSummary[]> {
  const lists = await db.shoppingList.findMany({
    where: { customerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  });
  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    itemCount: l._count.items,
    updatedAt: l.updatedAt,
  }));
}

/** One of the Customer's lists, or null. */
export async function getShoppingList(
  customerId: string,
  listId: string
): Promise<ShoppingListView | null> {
  const list = await owned(customerId, listId);
  if (!list) return null;
  const items = await db.shoppingListItem.findMany({
    where: { listId: list.id },
    orderBy: { createdAt: "asc" },
    select: { productId: true, quantity: true },
  });
  const products = new Map(
    (await getProductSummaries(items.map((i) => i.productId))).map((p) => [
      p.id,
      p,
    ])
  );
  return {
    id: list.id,
    name: list.name,
    items: items.flatMap((i) => {
      const product = products.get(i.productId);
      return product ? [{ product, quantity: i.quantity }] : [];
    }),
  };
}

/** What a list would add to the Cart, or null when it is not theirs. */
export async function shoppingListLines(
  customerId: string,
  listId: string
): Promise<{ productId: string; quantity: number }[] | null> {
  const list = await owned(customerId, listId);
  if (!list) return null;
  return db.shoppingListItem.findMany({
    where: { listId: list.id },
    orderBy: { createdAt: "asc" },
    select: { productId: true, quantity: true },
  });
}

async function checkName(
  customerId: string,
  name: string,
  exceptId?: string
): Promise<ListNameProblem | null> {
  if (!name) return "no_name";
  if (name.length > MAX_NAME) return "name_too_long";
  const same = await db.shoppingList.findFirst({
    where: {
      customerId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId && { id: { not: exceptId } }),
    },
    select: { id: true },
  });
  return same ? "name_taken" : null;
}

/** A new, empty list (a form result, ADR 0009). */
export async function createShoppingList(
  customerId: string,
  rawName: string
): Promise<NameResult> {
  const name = rawName.trim();
  const problem = await checkName(customerId, name);
  if (problem) return { ok: false, errors: { name: problem } };
  if ((await db.shoppingList.count({ where: { customerId } })) >= MAX_LISTS)
    return { ok: false, errors: { name: "too_many_lists" } };
  const list = await db.shoppingList.create({
    data: { customerId, name },
    select: { id: true },
  });
  return { ok: true, id: list.id };
}

export async function renameShoppingList(
  customerId: string,
  listId: string,
  rawName: string
): Promise<NameResult> {
  const list = await owned(customerId, listId);
  if (!list) return { ok: false, errors: { name: "list_gone" } };
  const name = rawName.trim();
  const problem = await checkName(customerId, name, list.id);
  if (problem) return { ok: false, errors: { name: problem } };
  await db.shoppingList.update({ where: { id: list.id }, data: { name } });
  return { ok: true, id: list.id };
}

/** True when it was theirs to delete. */
export async function deleteShoppingList(
  customerId: string,
  listId: string
): Promise<boolean> {
  if (!isUuid(listId)) return false;
  const { count } = await db.shoppingList.deleteMany({
    where: { id: listId, customerId },
  });
  return count > 0;
}

/**
 * Put Products on a list with these counts (a Product already there takes
 * the new count). Refused when the list is not theirs or would go past
 * MAX_LIST_ITEMS.
 */
export async function saveToList(
  customerId: string,
  listId: string,
  items: { productId: string; quantity: number }[]
): Promise<
  { ok: true } | { ok: false; reason: "not_found" | "too_many" | "invalid" }
> {
  const list = await owned(customerId, listId);
  if (!list) return { ok: false, reason: "not_found" };
  if (
    items.some(
      (i) =>
        !isUuid(i.productId) ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 99
    )
  )
    return { ok: false, reason: "invalid" };
  return db.$transaction(async (tx) => {
    const existing = await tx.shoppingListItem.findMany({
      where: { listId: list.id },
      select: { productId: true },
    });
    const ids = new Set(existing.map((e) => e.productId));
    for (const i of items) ids.add(i.productId);
    if (ids.size > MAX_LIST_ITEMS)
      return { ok: false as const, reason: "too_many" as const };
    for (const i of items) {
      await tx.shoppingListItem.upsert({
        where: {
          listId_productId: { listId: list.id, productId: i.productId },
        },
        create: {
          listId: list.id,
          productId: i.productId,
          quantity: i.quantity,
        },
        update: { quantity: i.quantity },
      });
    }
    // Lists are shown most recently used first.
    await tx.shoppingList.update({
      where: { id: list.id },
      data: { updatedAt: new Date() },
    });
    return { ok: true as const };
  });
}

/** True when the Product was on their list. */
export async function removeFromList(
  customerId: string,
  listId: string,
  productId: string
): Promise<boolean> {
  const list = await owned(customerId, listId);
  if (!list || !isUuid(productId)) return false;
  const { count } = await db.shoppingListItem.deleteMany({
    where: { listId: list.id, productId },
  });
  return count > 0;
}
