import type { PrismaClient } from "@/generated/prisma/client";

export type AuthUserInfo = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  /** Set by mobile OTP sign-in; the email is then a stand-in. */
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
};

/**
 * The Customer for a signed-in auth user, created on first sign-in. An
 * existing Customer row is linked by email or mobile number only when that
 * was verified, otherwise anyone could claim someone else's Orders by
 * typing their address or number.
 */
export async function customerForUser(db: PrismaClient, user: AuthUserInfo) {
  const linked = await db.customer.findUnique({
    where: { authUserId: user.id },
  });
  if (linked) return linked;

  const email = user.emailVerified ? user.email.toLowerCase() : null;
  const phone = user.phoneNumberVerified ? (user.phoneNumber ?? null) : null;
  const match = email ? { email } : phone ? { phone } : null;
  if (match) {
    const existing = await db.customer.findFirst({
      where: { ...match, authUserId: null },
    });
    if (existing) {
      return db.customer.update({
        where: { id: existing.id },
        data: { authUserId: user.id },
      });
    }
  }

  // A number already on another account stays there; this one starts blank.
  const phoneTaken =
    phone !== null &&
    (await db.customer.findFirst({
      where: { phone },
      select: { id: true },
    })) !== null;

  const create = db.customer.upsert({
    where: { authUserId: user.id },
    create: {
      authUserId: user.id,
      email,
      phone: phoneTaken ? null : phone,
      name: phone ? "Hoshimono shopper" : user.name || user.email.split("@")[0],
    },
    update: {},
  });
  // The header and the page may both ask during one request; the loser
  // of that race reads the row the winner made.
  return create.catch(async (error: unknown) => {
    if ((error as { code?: string }).code !== "P2002") throw error;
    return db.customer.findUniqueOrThrow({ where: { authUserId: user.id } });
  });
}
