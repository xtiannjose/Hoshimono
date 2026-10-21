import type { PrismaClient } from "@/generated/prisma/client";
import type { StaffRole } from "@/generated/prisma/enums";
import type { AuthUserInfo } from "@/modules/customers";

/** The parts of the staff screens a role can open (PRD ADM-11). */
export type StaffArea =
  | "picking"
  | "dispatch"
  | "delivery"
  | "stock"
  | "reports"
  | "setup"
  | "catalog"
  | "orders"
  | "refunds"
  | "staff"
  | "audit";

// Least privilege: each role gets only its own work.
const AREAS: Record<StaffRole, readonly StaffArea[]> = {
  admin: [
    "picking",
    "dispatch",
    "delivery",
    "stock",
    "reports",
    "setup",
    "catalog",
    "orders",
    "refunds",
    "staff",
    "audit",
  ],
  merchandiser: ["catalog"],
  dispatcher: ["dispatch", "orders", "stock", "reports"],
  picker: ["picking"],
  rider: ["delivery"],
};

/** Every area a role can open, in the order the staff menu lists them. */
export function staffAreas(role: StaffRole): readonly StaffArea[] {
  return AREAS[role];
}

/**
 * The active Staff member linked to this sign-in, or null. Staff rows are
 * created by an admin; sign-in links them by verified email.
 */
export async function activeStaff(db: PrismaClient, user: AuthUserInfo) {
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
  return staff?.isActive ? staff : null;
}

/** The active Staff member who may open `area`, or null. */
export async function staffForUser(
  db: PrismaClient,
  user: AuthUserInfo,
  area: StaffArea
) {
  const staff = await activeStaff(db, user);
  return staff && AREAS[staff.role].includes(area) ? staff : null;
}
