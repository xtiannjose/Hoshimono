import type { PrismaClient } from "@/generated/prisma/client";
import type { StaffRole } from "@/generated/prisma/enums";

export type AuthUserInfo = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

/**
 * The Customer for a signed-in auth user, created on first sign-in. An
 * existing Customer row is linked by email only when the email is verified,
 * otherwise anyone could claim someone else's Orders by typing their address.
 */
export async function customerForUser(db: PrismaClient, user: AuthUserInfo) {
  const linked = await db.customer.findUnique({
    where: { authUserId: user.id },
  });
  if (linked) return linked;

  const email = user.emailVerified ? user.email.toLowerCase() : null;
  if (email) {
    const byEmail = await db.customer.findFirst({
      where: { email, authUserId: null },
    });
    if (byEmail) {
      return db.customer.update({
        where: { id: byEmail.id },
        data: { authUserId: user.id },
      });
    }
  }

  return db.customer.upsert({
    where: { authUserId: user.id },
    create: {
      authUserId: user.id,
      email,
      name: user.name || user.email.split("@")[0],
    },
    update: {},
  });
}

/**
 * The active Staff member with `role` (admins pass every role check), or null.
 * Staff rows are created by an admin; sign-in links them by verified email.
 */
export async function staffForUser(
  db: PrismaClient,
  user: AuthUserInfo,
  role: StaffRole
) {
  let staff = await db.staff.findUnique({ where: { authUserId: user.id } });

  if (!staff && user.emailVerified) {
    const byEmail = await db.staff.findUnique({
      where: { email: user.email.toLowerCase() },
    });
    if (byEmail && byEmail.authUserId === null) {
      staff = await db.staff.update({
        where: { id: byEmail.id },
        data: { authUserId: user.id },
      });
    }
  }

  if (!staff?.isActive) return null;
  if (staff.role !== role && staff.role !== "admin") return null;
  return staff;
}
