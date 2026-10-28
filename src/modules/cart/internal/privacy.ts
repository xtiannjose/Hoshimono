import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// A Customer's data on request (ADR 0020): Shopping Lists and Carts.

export function shoppingListData(customerId: string) {
  return db.shoppingList.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
    select: {
      name: true,
      createdAt: true,
      items: {
        select: { quantity: true, product: { select: { name: true } } },
      },
    },
  });
}

/** Deletes the Customer's Carts (their lines and holds go with them) and lists. */
export async function eraseCustomerCarts(
  tx: Prisma.TransactionClient,
  customerId: string
): Promise<void> {
  await tx.cart.deleteMany({ where: { customerId } });
  await tx.shoppingList.deleteMany({ where: { customerId } });
}
