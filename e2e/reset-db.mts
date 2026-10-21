// Truncates and re-seeds the end-to-end database. Run by the Playwright
// webServer command before the dev server starts.
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "../prisma/seed-data";
import { resetDb } from "../tests/db/helpers";

const url = process.env.DATABASE_URL ?? "";
if (!/_e2e(\?|$)/.test(url))
  throw new Error("Refusing to reset a database that is not *_e2e");

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
try {
  await resetDb(db);
  await seedDatabase(db);
  // Most specs check out Fresh Milk at once; the seed's count runs out.
  await db.stockLevel.updateMany({
    where: { product: { slug: "magnolia-fresh-milk" } },
    data: { onHand: 200 },
  });
} finally {
  await db.$disconnect();
}
