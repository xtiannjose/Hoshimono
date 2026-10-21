import { randomInt } from "node:crypto";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { manilaDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { productName } from "@/lib/product-name";
import {
  checkOutCart,
  getCart,
  getCartId,
  readCartVersion,
} from "@/modules/cart";
import { getAddress } from "@/modules/customers";
import { bookSlot, resolveZone } from "@/modules/delivery";
import { OutOfStockError, reserveStock } from "@/modules/inventory";
import { enqueueJob } from "@/modules/jobs";
import { createCodPayment, createOnlinePayment } from "@/modules/payments";
import { redeemVoucher, VOUCHER_REFUSAL } from "@/modules/pricing";

import { OPEN_STATUSES, ORDER_CONFIRMED_JOB } from "./status";

/**
 * Cash-on-delivery Orders hold stock and Slot places without payment, so
 * one Customer may have only a few open at once, each under a cash limit.
 * Assumed values until operations set them.
 */
export const MAX_OPEN_COD_ORDERS = 3;
export const MAX_COD_TOTAL_CENTS = 2_000_000; // PHP 20,000

export type PlaceOrderInput = {
  customerId: string;
  addressId: string;
  slotId: string;
  contactPhone: string;
  riderNotes?: string | null;
  /** GCash and card Orders wait for the provider's paid webhook. */
  paymentMethod: "cod" | "gcash" | "card";
  /** The total the Customer saw; a different server total stops the Order. */
  expectedTotalCents: number;
  /** From the Checkout form, so a double-click places one Order. */
  idempotencyKey: string;
  now?: Date;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNo: string; replayed: boolean }
  | { ok: false; reason: "total_changed"; totalCents: number }
  | { ok: false; reason: "below_minimum"; shortByCents: number }
  | { ok: false; reason: "out_of_stock"; productIds: string[] }
  | { ok: false; reason: "over_cod_limit"; limitCents: number }
  /** The Cart's Voucher stopped applying, such as its last use going (ADR 0015). */
  | { ok: false; reason: "voucher_unavailable"; message: string }
  | {
      ok: false;
      reason:
        | "invalid"
        | "invalid_phone"
        | "address_not_found"
        | "out_of_zone"
        | "empty_cart"
        | "slot_unavailable"
        | "already_placed"
        | "nothing_in_stock"
        | "too_many_open_orders"
        | "cart_changed";
    };

const input = z.object({
  customerId: z.guid(),
  addressId: z.guid(),
  slotId: z.guid(),
  contactPhone: z.string(),
  riderNotes: z.string().trim().max(200).nullish(),
  paymentMethod: z.enum(["cod", "gcash", "card"]),
  expectedTotalCents: z.int().nonnegative(),
  idempotencyKey: z.string().min(16).max(100),
});

// No 0, O, 1 or I, so the number reads well over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "SW-261019-K7QX": Manila date and four random characters (docs/04). */
function newOrderNo(now: Date): string {
  const date = manilaDate(now).slice(2).replaceAll("-", "");
  const code = Array.from(
    { length: 4 },
    () => ALPHABET[randomInt(ALPHABET.length)]
  );
  return `SW-${date}-${code.join("")}`;
}

/** Ends the transaction (rolling it back) with a result for the Customer. */
class Refused extends Error {
  constructor(readonly result: PlaceOrderResult) {
    super(result.ok ? "ok" : result.reason);
  }
}

async function replay(
  customerId: string,
  key: string
): Promise<PlaceOrderResult | null> {
  const order = await db.order.findUnique({
    where: { idempotencyKey: key },
    select: { id: true, orderNo: true, customerId: true },
  });
  if (!order) return null;
  if (order.customerId !== customerId) return { ok: false, reason: "invalid" };
  return {
    ok: true,
    orderId: order.id,
    orderNo: order.orderNo,
    replayed: true,
  };
}

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string }).code === "P2002";

// Postgres gave up on the transaction (a deadlock or a write conflict):
// nothing was saved, so trying again is safe.
const isRetryable = (error: unknown) => {
  const code = (error as { code?: string }).code;
  return (
    code === "P2034" ||
    code === "40P01" ||
    /deadlock detected|could not serialize/i.test(String(error))
  );
};

/**
 * Turn the Customer's Cart into an Order (docs/03-ARCHITECTURE.md section 6).
 * Prices are recomputed here; nothing the browser sends is trusted except
 * the choices. One transaction closes the Cart, books the Slot, reserves
 * stock and writes the Order with snapshots, so any failure leaves nothing
 * behind. Idempotent on `idempotencyKey`.
 */
export async function placeOrder(
  raw: PlaceOrderInput
): Promise<PlaceOrderResult> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const order = parsed.data;
  const now = raw.now ?? new Date();
  const phone = normalizePhone(order.contactPhone);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const cod = order.paymentMethod === "cod";

  const earlier = await replay(order.customerId, order.idempotencyKey);
  if (earlier) return earlier;

  const address = await getAddress(order.customerId, order.addressId);
  if (!address) return { ok: false, reason: "address_not_found" };
  const zone = await resolveZone(address);
  if (!zone) return { ok: false, reason: "out_of_zone" };

  const owner = { customerId: order.customerId };
  const [cartId, cart] = await Promise.all([
    getCartId(owner),
    getCart(owner, { hubId: zone.hubId, zone: zone.fees, now }),
  ]);
  const { priced } = cart;
  // Out-of-stock lines were shown as "not in your total"; they stay out.
  const lines = priced.lines.map((p) => ({
    ...p,
    line: cart.lines.find((l) => l.product.id === p.productId)!,
  }));
  if (!cartId || cart.lines.length === 0) {
    return { ok: false, reason: "empty_cart" };
  }
  if (lines.length === 0) return { ok: false, reason: "nothing_in_stock" };
  if (priced.belowMinimumByCents > 0) {
    return {
      ok: false,
      reason: "below_minimum",
      shortByCents: priced.belowMinimumByCents,
    };
  }
  if (cod && priced.totalCents > MAX_COD_TOTAL_CENTS) {
    return {
      ok: false,
      reason: "over_cod_limit",
      limitCents: MAX_COD_TOTAL_CENTS,
    };
  }
  if (cart.voucher?.problem) {
    return {
      ok: false,
      reason: "voucher_unavailable",
      message: cart.voucher.problem,
    };
  }
  if (priced.totalCents !== order.expectedTotalCents) {
    return {
      ok: false,
      reason: "total_changed",
      totalCents: priced.totalCents,
    };
  }

  const write = async (tx: Prisma.TransactionClient) => {
    if (!(await checkOutCart(tx, cartId, now))) {
      throw new Refused({ ok: false, reason: "already_placed" });
    }
    // The Cart row is now locked: a line saved in another tab after it was
    // read above shows up here, and the Customer checks the Cart again.
    if ((await readCartVersion(tx, cartId)) !== cart.version) {
      throw new Refused({ ok: false, reason: "cart_changed" });
    }
    // Unpaid COD Orders hold stock for days; an online one for minutes.
    const open = cod
      ? await tx.order.count({
          where: {
            customerId: order.customerId,
            status: { in: OPEN_STATUSES },
          },
        })
      : 0;
    if (open >= MAX_OPEN_COD_ORDERS) {
      throw new Refused({ ok: false, reason: "too_many_open_orders" });
    }
    if (
      !(await bookSlot(tx, {
        slotId: order.slotId,
        cartId,
        hubId: zone.hubId,
        now,
      }))
    ) {
      throw new Refused({ ok: false, reason: "slot_unavailable" });
    }
    const created = await tx.order.create({
      data: {
        orderNo: newOrderNo(now),
        customerId: order.customerId,
        hubId: zone.hubId,
        slotId: order.slotId,
        status: cod ? "confirmed" : "pending_payment",
        paymentStatus: cod ? "cod_pending" : "unpaid",
        addressSnapshot: {
          label: address.label,
          line1: address.line1,
          barangay: address.barangay,
          city: address.city,
          landmark: address.landmark,
          notes: address.notes,
          zone: zone.name,
        },
        contactPhone: phone,
        riderNotes: order.riderNotes || null,
        subtotalCents: priced.subtotalCents,
        discountCents: priced.discountCents,
        deliveryFeeCents: priced.deliveryFeeCents ?? 0,
        vatCents: priced.vatCents,
        totalCents: priced.totalCents,
        idempotencyKey: order.idempotencyKey,
        placedAt: now,
      },
      select: { id: true, orderNo: true },
    });
    // Recorded under a lock: a Voucher's last use goes to one Order only.
    if (priced.voucher?.applied) {
      const redeemed = await redeemVoucher(tx, {
        code: priced.voucher.code,
        orderId: created.id,
        customerId: order.customerId,
        discountCents: priced.discountCents,
        now,
      });
      if (!redeemed.ok) {
        throw new Refused({
          ok: false,
          reason: "voucher_unavailable",
          message: VOUCHER_REFUSAL[redeemed.reason],
        });
      }
      await tx.order.update({
        where: { id: created.id },
        data: { voucherId: redeemed.voucherId },
      });
    }
    await reserveStock(tx, {
      hubId: zone.hubId,
      orderId: created.id,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
      })),
    });
    await tx.orderLine.createMany({
      data: lines.map(({ line, ...p }) => ({
        orderId: created.id,
        productId: p.productId,
        nameSnapshot: productName(line.product),
        unitPriceCents: p.unitPriceCents,
        taxClass: line.product.taxClass,
        vatCents: p.vatCents,
        orderedQty: p.quantity,
        orderedWeightGrams:
          line.product.isWeighed && line.product.packSize.unit === "g"
            ? line.product.packSize.value * p.quantity
            : null,
        lineTotalCents: p.lineTotalCents,
        substitutionPreference: line.substitution.preference,
        preferredProductId: line.substitution.preferredProductId,
        note: line.note,
      })),
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: created.id,
        to: cod ? "confirmed" : "pending_payment",
        actorType: "customer",
        actorId: order.customerId,
        at: now,
      },
    });
    if (order.paymentMethod === "cod") {
      await createCodPayment(tx, {
        orderId: created.id,
        amountCents: priced.totalCents,
      });
      // In the same transaction, so a placed Order always gets its notice.
      await enqueueJob(tx, ORDER_CONFIRMED_JOB, { orderId: created.id });
    } else {
      // Confirmed, with its notice, when the provider says paid.
      await createOnlinePayment(tx, {
        orderId: created.id,
        method: order.paymentMethod,
        amountCents: priced.totalCents,
      });
    }
    return created;
  };

  for (let attempt = 1; ; attempt++) {
    try {
      const created = await db.$transaction(write, {
        maxWait: 5_000,
        timeout: 15_000,
      });
      return {
        ok: true,
        orderId: created.id,
        orderNo: created.orderNo,
        replayed: false,
      };
    } catch (error) {
      // A twin request may have won with the same key: answer with its Order.
      const twin = await replay(order.customerId, order.idempotencyKey);
      if (twin) return twin;
      if (error instanceof Refused) return error.result;
      if (error instanceof OutOfStockError) {
        return {
          ok: false,
          reason: "out_of_stock",
          productIds: error.productIds,
        };
      }
      // Two Orders drew the same number, or Postgres broke a deadlock: again.
      if ((isUniqueViolation(error) || isRetryable(error)) && attempt < 3) {
        continue;
      }
      throw error;
    }
  }
}
