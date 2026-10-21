import { StaffRole } from "@/generated/prisma/enums";
import { db, type Client } from "@/lib/db";

// Admin writes to Staff (PRD ADM-11). Callers check requireStaff("staff").

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
  /** Has signed in at least once. */
  linked: boolean;
};

/** Everyone on the staff list, active first, by name. */
export async function listStaff(client: Client = db): Promise<StaffRow[]> {
  const rows = await client.staff.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      authUserId: true,
    },
  });
  return rows.map(({ authUserId, ...s }) => ({ ...s, linked: !!authUserId }));
}

type StaffErrors = Partial<
  Record<"name" | "email" | "role" | "isActive", string>
>;
type StaffResult<T = object> =
  ({ ok: true } & T) | { ok: false; errors: StaffErrors };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isRole = (role: string): role is StaffRole =>
  Object.values(StaffRole).includes(role as StaffRole);

/**
 * Add a Staff member. They sign in with this email; sign-in links them by
 * verified email (link.ts). ADR 0009 form result.
 */
export async function addStaff(
  input: { name: string; email: string; role: string },
  client: Client = db
): Promise<StaffResult<{ id: string }>> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const errors: StaffErrors = {};
  if (!name || name.length > 80) errors.name = "Enter a name.";
  if (!EMAIL.test(email)) errors.email = "Enter an email address.";
  if (!isRole(input.role)) errors.role = "Choose a role.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (
    await client.staff.findUnique({ where: { email }, select: { id: true } })
  ) {
    return {
      ok: false,
      errors: { email: "This email already belongs to a staff member." },
    };
  }
  const created = await client.staff.create({
    data: { name, email, role: input.role as StaffRole },
    select: { id: true },
  });
  return { ok: true, id: created.id };
}

/**
 * Change a role, or switch an account off or on. Never your own: the acting
 * admin stays an active admin, so the shop always has one.
 */
export async function updateStaff(
  id: string,
  patch: { role?: string; isActive?: boolean },
  actingStaffId: string,
  client: Client = db
): Promise<StaffResult> {
  if (patch.role !== undefined && !isRole(patch.role)) {
    return { ok: false, errors: { role: "Choose a role." } };
  }
  if (id === actingStaffId) {
    if (patch.role !== undefined) {
      return {
        ok: false,
        errors: { role: "You cannot change your own role." },
      };
    }
    if (patch.isActive === false) {
      return {
        ok: false,
        errors: { isActive: "You cannot switch your own account off." },
      };
    }
  }
  const { count } = await client.staff.updateMany({
    where: { id },
    data: {
      ...(patch.role !== undefined ? { role: patch.role as StaffRole } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    },
  });
  return count === 1
    ? { ok: true }
    : { ok: false, errors: { name: "No such staff member." } };
}

export type AuditRow = {
  id: string;
  at: Date;
  staffName: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
};

/** The audit log, newest first (docs/03 section 12). */
export async function listAudits({
  entity,
  limit = 100,
}: {
  entity?: string;
  limit?: number;
}): Promise<AuditRow[]> {
  const rows = await db.auditLog.findMany({
    where: entity ? { entity } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      createdAt: true,
      action: true,
      entity: true,
      entityId: true,
      before: true,
      after: true,
      staff: { select: { name: true } },
    },
  });
  return rows.map(({ staff, createdAt, ...r }) => ({
    ...r,
    at: createdAt,
    staffName: staff.name,
  }));
}
