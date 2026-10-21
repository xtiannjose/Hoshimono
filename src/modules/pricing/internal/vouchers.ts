import { randomInt } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { db, type Client } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

import type { VoucherTerms } from "./discounts";

// Vouchers (ADR 0015). shortcut: counting a Customer's Orders and a
// Voucher's uses reads orders through relations rather than the orders module.

export type VoucherRefusal =
  | "not_found"
  | "not_started"
  | "ended"
  | "not_yours"
  | "first_order_only"
  | "used_up"
  | "used_by_you";

export type VoucherCheck =
  | { ok: true; voucherId: string; terms: VoucherTerms }
  | { ok: false; reason: VoucherRefusal };

/** What to tell the Customer when a Voucher does not apply. */
export const VOUCHER_REFUSAL: Record<VoucherRefusal, string> = {
  not_found: "We do not know that code. Check it and try again.",
  not_started: "This Voucher has not started yet.",
  ended: "This Voucher has ended.",
  not_yours: "This Voucher belongs to another account.",
  first_order_only: "This Voucher is for a first order only.",
  used_up: "This Voucher has been fully used.",
  used_by_you: "You have already used this Voucher.",
};

/** Codes are kept upper case without spaces: "save 10" is "SAVE10". */
export const normalizeCode = (code: string) =>
  code.toUpperCase().replace(/\s+/g, "");

// Uses by Orders that were not cancelled; `except` leaves out the Order
// being placed.
const live = (except?: string): Prisma.VoucherRedemptionWhereInput => ({
  order: { status: { not: "cancelled" } },
  ...(except && { orderId: { not: except } }),
});

async function checkWith(
  client: Client,
  rawCode: string,
  customerId: string,
  now: Date,
  except?: string
): Promise<VoucherCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "not_found" };
  const v = await client.voucher.findUnique({ where: { code } });
  if (!v || !v.isActive) return { ok: false, reason: "not_found" };
  if (now < v.startsAt) return { ok: false, reason: "not_started" };
  if (now >= v.endsAt) return { ok: false, reason: "ended" };
  if (v.customerId && v.customerId !== customerId)
    return { ok: false, reason: "not_yours" };
  if (v.firstOrderOnly) {
    const earlier = await client.order.count({
      where: {
        customerId,
        status: { not: "cancelled" },
        ...(except && { id: { not: except } }),
      },
    });
    if (earlier > 0) return { ok: false, reason: "first_order_only" };
  }
  if (v.usageLimit !== null) {
    const uses = await client.voucherRedemption.count({
      where: { voucherId: v.id, ...live(except) },
    });
    if (uses >= v.usageLimit) return { ok: false, reason: "used_up" };
  }
  const mine = await client.voucherRedemption.count({
    where: { voucherId: v.id, customerId, ...live(except) },
  });
  if (mine >= v.perCustomerLimit) return { ok: false, reason: "used_by_you" };
  return {
    ok: true,
    voucherId: v.id,
    terms: {
      code: v.code,
      kind: v.kind,
      value: v.value,
      maxDiscountCents: v.maxDiscountCents,
      minSpendCents: v.minSpendCents,
    },
  };
}

/** May this Customer use this code now? A refusal says why (ADR 0009). */
export function checkVoucher(
  code: string,
  customerId: string,
  now = new Date()
): Promise<VoucherCheck> {
  return checkWith(db, code, customerId, now);
}

/**
 * Record a Voucher against the Order being placed, inside its transaction.
 * The Voucher row is locked first and every rule checked again, so its last
 * use goes to exactly one Order.
 */
export async function redeemVoucher(
  tx: Prisma.TransactionClient,
  input: {
    code: string;
    orderId: string;
    customerId: string;
    discountCents: number;
    now: Date;
  }
): Promise<VoucherCheck> {
  await tx.$queryRaw`
    SELECT id FROM vouchers WHERE code = ${normalizeCode(input.code)} FOR UPDATE`;
  const check = await checkWith(
    tx,
    input.code,
    input.customerId,
    input.now,
    input.orderId
  );
  if (!check.ok) return check;
  await tx.voucherRedemption.create({
    data: {
      voucherId: check.voucherId,
      orderId: input.orderId,
      customerId: input.customerId,
      discountCents: input.discountCents,
    },
  });
  return check;
}

// No 0, 1, I or O: codes are read aloud and typed from a phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (length: number) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

export const REFERRAL_REWARD_CENTS = 10000;
const REWARD_MIN_SPEND_CENTS = 50000;
const REWARD_DAYS = 60;

/** A personal ₱100 Voucher for a Referral (ADR 0015), in the caller's transaction. */
export async function createRewardVoucher(
  tx: Prisma.TransactionClient,
  customerId: string,
  now = new Date()
): Promise<{ id: string; code: string; minSpendCents: number; endsAt: Date }> {
  for (;;) {
    const code = `FRIEND-${randomCode(6)}`;
    if (await tx.voucher.count({ where: { code } })) continue;
    return tx.voucher.create({
      data: {
        code,
        kind: "amount",
        value: REFERRAL_REWARD_CENTS,
        minSpendCents: REWARD_MIN_SPEND_CENTS,
        startsAt: now,
        endsAt: new Date(now.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000),
        usageLimit: 1,
        perCustomerLimit: 1,
        customerId,
      },
      select: { id: true, code: true, minSpendCents: true, endsAt: true },
    });
  }
}

/** A Customer's own Vouchers (Referral rewards), with whether they were used. */
export async function listCustomerVouchers(customerId: string) {
  const vouchers = await db.voucher.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      value: true,
      minSpendCents: true,
      endsAt: true,
      _count: { select: { redemptions: { where: live() } } },
    },
  });
  return vouchers.map(({ _count, ...v }) => ({
    ...v,
    used: _count.redemptions > 0,
  }));
}

// ---------- staff ----------

export type VoucherInput = {
  code: string;
  kind: "percent" | "amount" | "free_delivery";
  value: number;
  maxDiscountCents: number | null;
  minSpendCents: number;
  startsAt: Date;
  endsAt: Date;
  usageLimit: number | null;
  perCustomerLimit: number;
  firstOrderOnly: boolean;
  isActive: boolean;
};

/** Staff Vouchers (not Referral rewards), with how often each was used. */
export async function listVouchersForAdmin() {
  const vouchers = await db.voucher.findMany({
    where: { customerId: null },
    orderBy: [{ isActive: "desc" }, { endsAt: "desc" }],
    include: { _count: { select: { redemptions: { where: live() } } } },
  });
  return vouchers.map(({ _count, ...v }) => ({
    ...v,
    uses: _count.redemptions,
  }));
}

export async function getVoucherForAdmin(id: string) {
  return isUuid(id) ? db.voucher.findUnique({ where: { id } }) : null;
}

/** Create (no `id`) or update a staff Voucher (a form result, ADR 0009). */
export async function saveVoucher(
  input: VoucherInput,
  id?: string,
  client: Client = db
): Promise<
  { ok: true; id: string } | { ok: false; errors: Record<string, string> }
> {
  const errors: Record<string, string> = {};
  const code = normalizeCode(input.code);
  if (!/^[A-Z0-9-]{3,24}$/.test(code))
    errors.code = "Use 3 to 24 letters, numbers or dashes.";
  const whole = (n: number) => Number.isInteger(n);
  if (
    input.kind === "percent" &&
    !(whole(input.value) && input.value >= 1 && input.value <= 90)
  )
    errors.value = "Take off 1 to 90 percent.";
  if (input.kind === "amount" && !(whole(input.value) && input.value >= 1))
    errors.value = "Enter how much off, such as 100.00.";
  if (
    input.maxDiscountCents !== null &&
    !(whole(input.maxDiscountCents) && input.maxDiscountCents >= 1)
  )
    errors.maxDiscountCents = "Enter the most it takes off, or leave it blank.";
  if (!(whole(input.minSpendCents) && input.minSpendCents >= 0))
    errors.minSpendCents = "Enter 0 or more.";
  if (
    input.usageLimit !== null &&
    !(whole(input.usageLimit) && input.usageLimit >= 1)
  )
    errors.usageLimit = "Enter 1 or more, or leave it blank for no limit.";
  if (!(whole(input.perCustomerLimit) && input.perCustomerLimit >= 1))
    errors.perCustomerLimit = "Enter 1 or more.";
  if (Number.isNaN(input.startsAt.getTime()))
    errors.startsAt = "Choose when it starts.";
  if (Number.isNaN(input.endsAt.getTime()))
    errors.endsAt = "Choose when it ends.";
  else if (input.endsAt <= input.startsAt)
    errors.endsAt = "End it after it starts.";
  if (!errors.code) {
    const taken = await client.voucher.findFirst({
      where: { code, ...(id && { id: { not: id } }) },
      select: { id: true },
    });
    if (taken) errors.code = `There is already a Voucher ${code}.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const data = {
    ...input,
    code,
    value: input.kind === "free_delivery" ? 0 : input.value,
    maxDiscountCents: input.kind === "percent" ? input.maxDiscountCents : null,
  };
  if (id) {
    const { count } = await client.voucher.updateMany({
      where: { id, customerId: null },
      data,
    });
    return count
      ? { ok: true, id }
      : { ok: false, errors: { form: "That Voucher no longer exists." } };
  }
  const created = await client.voucher.create({ data, select: { id: true } });
  return { ok: true, id: created.id };
}
