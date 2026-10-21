import { db } from "@/lib/db";
import { productName } from "@/lib/product-name";
import { enqueueJob } from "@/modules/jobs";

// Cart Reminders (ADR 0014). shortcut: reads the Customer's consent and
// email through the Cart's relation rather than the customers module.

export const CART_REMINDER_JOB = "cart.reminder";

const HOUR = 60 * 60 * 1000;
/** Idle this long before the reminder... */
export const REMIND_AFTER_HOURS = 3;
/** ...and not once the Cart has been idle this long. */
const TOO_LATE_HOURS = 48;

/**
 * Queue one reminder for each opted-in Customer's Cart that has items, was
 * not checked out, and last changed 3 hours to 2 days ago. Marking the Cart
 * and queueing the job commit together, so it is sent once. For the cron.
 */
export async function queueCartReminders(now = new Date()): Promise<number> {
  const from = new Date(now.getTime() - TOO_LATE_HOURS * HOUR);
  const to = new Date(now.getTime() - REMIND_AFTER_HOURS * HOUR);
  return db.$transaction(async (tx) => {
    const due = await tx.$queryRaw<{ id: string }[]>`
      SELECT c.id
      FROM carts c
      JOIN customers cu ON cu.id = c.customer_id
      JOIN LATERAL (
        SELECT max(updated_at) AS last FROM cart_lines WHERE cart_id = c.id
      ) l ON l.last IS NOT NULL
      WHERE c.checked_out_at IS NULL
        AND c.reminded_at IS NULL
        AND cu.marketing_opt_in
        AND cu.email IS NOT NULL
        AND greatest(l.last, c.updated_at) <= ${to}
        AND greatest(l.last, c.updated_at) > ${from}
      FOR UPDATE OF c SKIP LOCKED`;
    for (const { id } of due) {
      await tx.cart.update({ where: { id }, data: { remindedAt: now } });
      await enqueueJob(tx, CART_REMINDER_JOB, { cartId: id });
    }
    return due.length;
  });
}

/**
 * What a reminder says, or null when there is nothing to remind about
 * (ordered, emptied, or the Customer said no since it was queued).
 */
export async function getCartReminder(cartId: string) {
  const cart = await db.cart.findUnique({
    where: { id: cartId },
    select: {
      checkedOutAt: true,
      customer: {
        select: { id: true, name: true, email: true, marketingOptIn: true },
      },
      lines: {
        orderBy: { createdAt: "asc" },
        select: { product: { select: { name: true, brand: true } } },
      },
    },
  });
  const customer = cart?.customer;
  if (
    !cart ||
    cart.checkedOutAt ||
    cart.lines.length === 0 ||
    !customer?.email ||
    !customer.marketingOptIn
  )
    return null;
  return {
    customerId: customer.id,
    name: customer.name,
    email: customer.email,
    items: cart.lines.map((l) => productName(l.product)),
  };
}
