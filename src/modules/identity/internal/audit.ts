import type { Prisma } from "@/generated/prisma/client";
import { db, type Client } from "@/lib/db";

export type AuditEntry = {
  staffId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

// null and undefined both store nothing: a nullable JSON column takes no bare null.
const json = (value: unknown) =>
  value == null
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

/**
 * Append-only record of admin writes: who, what, before, after
 * (docs/03-ARCHITECTURE.md section 12). Pass the write's transaction so
 * the change and its record commit together.
 */
export async function recordAudits(
  entries: AuditEntry[],
  client: Client = db
): Promise<void> {
  if (entries.length === 0) return;
  await client.auditLog.createMany({
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
