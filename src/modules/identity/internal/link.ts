import type { PrismaClient } from "@/generated/prisma/client";
import type { StaffRole } from "@/generated/prisma/enums";
import type { AuthUserInfo } from "@/modules/customers";

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
