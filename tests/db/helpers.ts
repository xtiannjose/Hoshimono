import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Tests wipe tables, so refuse anything that is not a *_test database.
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !/\/[\w-]*_test(\?|$)/.test(url)) {
    throw new Error(
      `Refusing to run database tests against ${url ?? "(unset)"}; set DATABASE_URL in .env.test to a *_test database.`
    );
  }
  return url;
}

export function createTestDb(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl() }),
  });
}

export async function resetDb(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe(`
    DO $$ DECLARE t text;
    BEGIN
      SELECT string_agg(format('%I', tablename), ', ') INTO t
      FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
      EXECUTE 'TRUNCATE ' || t || ' CASCADE';
    END $$;`);
}
