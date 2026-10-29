import { randomInt } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { Lang } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// Referrals (ADR 0015): each Customer's code, who invited whom, and the
// reward ledger. shortcut: "has ordered" reads orders through a relation.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE = /^[A-Z2-9]{6}$/;
const newCode = () =>
  Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
    ""
  );

/** The Customer's Referral Code, made the first time it is asked for. */
export async function getReferralCode(customerId: string): Promise<string> {
  const customer = await db.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { referralCode: true },
  });
  if (customer.referralCode) return customer.referralCode;
  for (;;) {
    const code = newCode();
    if (await db.customer.count({ where: { referralCode: code } })) continue;
    // Two tabs at once: whichever wrote first wins, the other reads it back.
    await db.customer.updateMany({
      where: { id: customerId, referralCode: null },
      data: { referralCode: code },
    });
    const saved = await db.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { referralCode: true },
    });
    return saved.referralCode!;
  }
}

export type ReferralRefusal = "unknown" | "own" | "already" | "not_new";

/**
 * Link a new Customer to whoever invited them, before their first Order.
 * A refusal says why (ADR 0009); the shop shows none of them.
 */
export async function applyReferral(
  customerId: string,
  rawCode: string
): Promise<{ ok: true } | { ok: false; reason: ReferralRefusal }> {
  const code = rawCode.trim().toUpperCase();
  if (!CODE.test(code)) return { ok: false, reason: "unknown" };
  const [referrer, me] = await Promise.all([
    db.customer.findUnique({
      where: { referralCode: code },
      select: { id: true },
    }),
    db.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { referredById: true, _count: { select: { orders: true } } },
    }),
  ]);
  if (!referrer) return { ok: false, reason: "unknown" };
  if (referrer.id === customerId) return { ok: false, reason: "own" };
  if (me.referredById) return { ok: false, reason: "already" };
  if (me._count.orders > 0) return { ok: false, reason: "not_new" };
  await db.customer.update({
    where: { id: customerId },
    data: { referredById: referrer.id },
  });
  return { ok: true };
}

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lang: Lang;
};

/**
 * Reward a delivered first Order of an invited Customer: one Voucher each,
 * made by `voucherFor` in the same transaction as the ledger row, so a
 * friend is rewarded once (ADR 0015). Null when there is nothing to reward.
 */
export async function rewardReferral<V extends { id: string }>(
  refereeId: string,
  orderId: string,
  voucherFor: (tx: Prisma.TransactionClient, customerId: string) => Promise<V>
): Promise<{
  rewardId: string;
  referrer: Contact & { voucher: V };
  referee: Contact & { voucher: V };
} | null> {
  const contact = {
    id: true,
    name: true,
    email: true,
    phone: true,
    lang: true,
  } as const;
  return db.$transaction(async (tx) => {
    const referee = await tx.customer.findUnique({
      where: { id: refereeId },
      select: {
        ...contact,
        referredBy: { select: contact },
        rewardReceived: { select: { id: true } },
      },
    });
    if (!referee?.referredBy || referee.rewardReceived) return null;
    const delivered = await tx.order.count({
      where: { customerId: refereeId, status: "delivered" },
    });
    // Only the first delivered Order earns the reward.
    if (delivered !== 1) return null;
    const forReferrer = await voucherFor(tx, referee.referredBy.id);
    const forReferee = await voucherFor(tx, refereeId);
    const reward = await tx.referralReward.create({
      data: {
        referrerId: referee.referredBy.id,
        refereeId,
        orderId,
        referrerVoucherId: forReferrer.id,
        refereeVoucherId: forReferee.id,
      },
      select: { id: true },
    });
    const { referredBy, rewardReceived: _, ...me } = referee;
    return {
      rewardId: reward.id,
      referrer: { ...referredBy, voucher: forReferrer },
      referee: { ...me, voucher: forReferee },
    };
  });
}

/** Friends who joined with this Customer's code, and what each earned. */
export async function listReferrals(customerId: string) {
  const friends = await db.customer.findMany({
    where: { referredById: customerId },
    orderBy: { createdAt: "desc" },
    select: {
      name: true,
      createdAt: true,
      rewardReceived: { select: { createdAt: true } },
    },
  });
  // First names only: friends see each other's activity, not details.
  return friends.map((f) => ({
    name: f.name.split(" ")[0] || "A friend",
    joinedAt: f.createdAt,
    rewardedAt: f.rewardReceived?.createdAt ?? null,
  }));
}
