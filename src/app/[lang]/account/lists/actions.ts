"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createShoppingList,
  deleteShoppingList,
  getCartQuantities,
  removeFromList,
  renameShoppingList,
  saveToList,
  shoppingListLines,
} from "@/modules/cart";
import { requireCustomer } from "@/modules/identity";

import { fillCart, type FillResult } from "../../cart/fill";

// Shopping Lists (ADR 0014). Each action re-checks the Customer; the cart
// module refuses lists that are not theirs.

export type ListFormState = { errors: Record<string, string>; saved?: boolean };

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const NEW = "new";

/** A new list, from the lists page. */
export async function createListAction(
  _prev: ListFormState,
  fd: FormData
): Promise<ListFormState> {
  const customer = await requireCustomer("/account/lists");
  const result = await createShoppingList(customer.id, text(fd, "name"));
  if (!result.ok) return { errors: result.errors };
  redirect(`/account/lists/${result.id}`);
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
  if (!result.ok) return { errors: result.errors };
  refresh();
  return { errors: {}, saved: true };
}

export async function deleteListAction(listId: string): Promise<void> {
  const customer = await requireCustomer("/account/lists");
  await deleteShoppingList(customer.id, listId);
  redirect("/account/lists");
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
    if (!created.ok) return { errors: created.errors };
    listId = created.id;
  }
  const saved = await saveToList(customerId, listId, items);
  if (!saved.ok)
    return {
      errors: {
        listId:
          saved.reason === "too_many"
            ? "That list is full: 100 items at most."
            : "That did not save. Please try again.",
      },
    };
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
    return { errors: { listId: "That did not save. Please try again." } };
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
  if (items.length === 0) return { errors: { name: "Your cart is empty." } };
  return intoList(customer.id, fd, items);
}
