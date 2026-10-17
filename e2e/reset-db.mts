// Truncates and re-seeds the end-to-end database. Run by the Playwright
// webServer command before the dev server starts.
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "../prisma/seed-data";

const url = process.env.DATABASE_URL ?? "";
if (!/_e2e(\?|$)/.test(url))
  throw new Error("Refusing to reset a database that is not *_e2e");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
try {
  await db.$executeRawUnsafe(`
    DO $$ DECLARE t text;
    BEGIN
      SELECT string_agg(format('%I', tablename), ', ') INTO t
      FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
      EXECUTE 'TRUNCATE ' || t || ' CASCADE';
    END $$;`);
  await seedDatabase(db);
} finally {
  await db.$disconnect();
}
