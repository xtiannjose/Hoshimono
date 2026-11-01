import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "./seed-data";

config({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
// The seed makes test Customers with real-looking mobile numbers; whoever
// owns such a number would sign in as that Customer. Remote databases (a
// Neon dev branch) need ALLOW_REMOTE_SEED=1, so production is never seeded
// by mistake.
if (
  !/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString) &&
  process.env.ALLOW_REMOTE_SEED !== "1"
) {
  throw new Error(
    "Refusing to seed a remote database. Set ALLOW_REMOTE_SEED=1 for a dev branch."
  );
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

seedDatabase(db)
  .then(() => console.log("Seed complete."))
  .finally(() => db.$disconnect());
