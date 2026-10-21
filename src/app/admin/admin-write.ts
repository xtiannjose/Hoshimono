import "server-only";

import { db, type Client } from "@/lib/db";
import { recordAudits, type AuditEntry } from "@/modules/identity";

export type Change = Omit<AuditEntry, "staffId">;

// Thrown so a refused write's transaction rolls back cleanly (a failed
// statement leaves it unusable), then handed back as a normal result.
class Refused<T> extends Error {
  constructor(readonly result: T) {
    super("Refused");
  }
}

/** One admin write and its audit rows, committed together. */
export async function adminWrite<T extends { ok: boolean }>(
  staffId: string,
  write: (tx: Client) => Promise<T>,
  changes: (done: Extract<T, { ok: true }>) => Change[],
  options?: { timeout?: number }
): Promise<T> {
  try {
    return await db.$transaction(async (tx) => {
      const result = await write(tx);
      if (!result.ok) throw new Refused(result);
      const done = result as Extract<T, { ok: true }>;
      await recordAudits(
        changes(done).map((c) => ({ ...c, staffId })),
        tx
      );
      return result;
    }, options);
  } catch (error) {
    if (error instanceof Refused) return error.result as T;
    throw error;
  }
}
