import { execSync } from "node:child_process";

import { config } from "dotenv";

import { testDatabaseUrl } from "./helpers";

// Bring the test database up to the latest migration once per run.
export default function setup() {
  config({ path: ".env.test", override: true, quiet: true });
  const url = testDatabaseUrl();
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
