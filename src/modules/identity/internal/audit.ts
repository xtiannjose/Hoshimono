import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Append-only record of an admin write: who, what, before, after
 * (docs/03-ARCHITECTURE.md section 12).
 */
export async function recordAudit(entry: {
  staffId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  const json = (v: unknown) =>
    v === undefined
      ? undefined
      : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
  await db.auditLog.create({
    data: {
      staffId: entry.staffId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: json(entry.before),
      after: json(entry.after),
    },
  });
}
