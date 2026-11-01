import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, type Prisma } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db = globalForDb.db ?? createClient();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

/** The shared client, or a transaction a caller already opened. */
export type Client = typeof db | Prisma.TransactionClient;

/** Runs `work` in the caller's transaction, or in a new one when given `db`. */
export function inTransaction<T>(
  client: Client,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number }
): Promise<T> {
  return client === db ? db.$transaction(work, options) : work(client);
}

/**
 * Postgres gave up on a transaction (a deadlock or a write conflict):
 * nothing was saved, so trying again is safe.
 */
export function isRetryable(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  return (
    code === "P2034" ||
    code === "40P01" ||
    /deadlock detected|could not serialize/i.test(String(error))
  );
}

/** Runs a whole transaction again when Postgres broke a deadlock, up to 3 times. */
export async function retryConflicts<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= 3 || !isRetryable(error)) throw error;
    }
  }
}
