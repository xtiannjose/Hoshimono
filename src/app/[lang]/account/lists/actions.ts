"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { langOf, localPath } from "@/i18n/lang";
import { MESSAGES } from "@/i18n/messages";
import {
  createShoppingList,
  deleteShoppingList,
  getCartQuantities,
  MAX_LIST_ITEMS,
  MAX_LISTS,
  removeFromList,
  renameShoppingList,
  saveToList,
  shoppingListLines,
  type ListNameProblem,
} from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";

import { fillCart, type FillResult } from "../../cart/fill";

// Shopping Lists (ADR 0014). Each action re-checks the Customer; the cart
// module refuses lists that are not theirs. Server Actions cannot read the
// language, so the forms send it (ADR 0017) and answers are worded here.

export type ListFormState = { errors: Record<string, string>; saved?: boolean };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const NEW = "new";

/** The page's words for list problems. */
const problems = (fd: FormData) =>
  MESSAGES[langOf(fd.get("lang"))].lists.problems;

/** A refused list name in the page's language (ADR 0019). */
function nameError(fd: FormData, problem: ListNameProblem): ListFormState {
  const t = problems(fd);
  const name =
    problem === "name_taken"
      ? t.name_taken(text(fd, "name"))
      : problem === "too_many_lists"
        ? t.too_many_lists(MAX_LISTS)
        : t[problem];
  return { errors: { name } };
}

/** A new list, from the lists page. */
export async function createListAction(
  _prev: ListFormState,
  fd: FormData
): Promise<ListFormState> {
  const customer = await requireCustomer("/account/lists");
  const result = await createShoppingList(customer.id, text(fd, "name"));
  if (!result.ok) return nameError(fd, result.errors.name);
  redirect(localPath(langOf(fd.get("lang")), `/account/lists/${result.id}`));
}

export async function renameListAction(
  listId: string,
  _prev: ListFormState,
  fd: FormData
): Promise<ListFormState> {
  const customer = await requireCustomer(`/account/lists/${listId}`);
  const result = await renameShoppingList(
    customer.id,
    listId,
    text(fd, "name")
  );
  if (!result.ok) return nameError(fd, result.errors.name);
  refresh();
  return { errors: {}, saved: true };
}

export async function deleteListAction(
  listId: string,
  fd: FormData
): Promise<void> {
  const customer = await requireCustomer("/account/lists");
  await deleteShoppingList(customer.id, listId);
  redirect(localPath(langOf(fd.get("lang")), "/account/lists"));
}

export async function removeFromListAction(
  listId: string,
  productId: string
): Promise<void> {
  const customer = await requireCustomer(`/account/lists/${listId}`);
  await removeFromList(customer.id, listId, productId);
  refresh();
}

export async function setListQuantityAction(
  listId: string,
  productId: string,
  quantity: number
): Promise<void> {
  const customer = await requireCustomer(`/account/lists/${listId}`);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
  await saveToList(customer.id, listId, [{ productId, quantity }]);
  refresh();
}

/** The whole list onto the Cart, on top of what is there. */
export async function listToCartAction(listId: string): Promise<FillResult> {
  const customer = await requireCustomer(`/account/lists/${listId}`);
  return fillCart((await shoppingListLines(customer.id, listId)) ?? []);
}

/** Into the chosen list, or a new one named here (creating it first). */
async function intoList(
  customerId: string,
  fd: FormData,
  items: { productId: string; quantity: number }[]
): Promise<ListFormState> {
  let listId = text(fd, "listId");
  if (!listId || listId === NEW) {
    const created = await createShoppingList(customerId, text(fd, "name"));
    if (!created.ok) return nameError(fd, created.errors.name);
    listId = created.id;
  }
  const saved = await saveToList(customerId, listId, items);
  if (!saved.ok) {
    const t = problems(fd);
    return {
      errors: {
        listId:
          saved.reason === "too_many"
            ? t.list_full(MAX_LIST_ITEMS)
            : t.not_saved,
      },
    };
  }
  return { errors: {}, saved: true };
}

/** "Save to a list" on a Product page. */
export async function saveProductAction(
  productId: string,
  _prev: ListFormState,
  fd: FormData
): Promise<ListFormState> {
  const customer = await requireCustomer();
  if (!z.guid().safeParse(productId).success)
    return { errors: { listId: problems(fd).not_saved } };
  return intoList(customer.id, fd, [{ productId, quantity: 1 }]);
}

/** "Save as a list" on the Cart page: every line with its count. */
export async function saveCartAction(
  _prev: ListFormState,
  fd: FormData
): Promise<ListFormState> {
  const customer = await requireCustomer("/cart");
  const quantities = await getCartQuantities({ customerId: customer.id });
  const items = Object.entries(quantities).map(([productId, quantity]) => ({
    productId,
    quantity: Math.min(quantity, 99),
  }));
  if (items.length === 0) return { errors: { name: problems(fd).empty_cart } };
  return intoList(customer.id, fd, items);
}
