import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local; Prisma does not, so load it here. Variables
// already set (CI, Vitest global setup) win over the file.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations use the direct (non-pooled) connection. Optional so that
  // `prisma generate` works without a database, for example in CI installs.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
