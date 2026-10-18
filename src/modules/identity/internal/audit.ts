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

/** Several audit entries in one write, such as one per imported Product. */
export async function recordAudits(
  entries: {
    staffId: string;
    action: string;
    entity: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
  }[]
): Promise<void> {
  const json = (v: unknown) =>
    v === undefined || v === null
      ? undefined
      : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
  if (entries.length === 0) return;
  await db.auditLog.createMany({
    data: entries.map((e) => ({
      staffId: e.staffId,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      before: json(e.before),
      after: json(e.after),
    })),
  });
}
