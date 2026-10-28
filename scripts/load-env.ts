// Points the app's database client at hoshimono_load and brings its schema
// up to date. Imported first, so it runs before @/lib/db reads DATABASE_URL.
import { execSync } from "node:child_process";

const url =
  process.env.LOAD_DATABASE_URL ??
  "postgresql://postgres:dev@localhost:5433/hoshimono_load";
process.env.DATABASE_URL = url;
execSync("npx prisma migrate deploy", {
  env: { ...process.env, DIRECT_URL: url },
  stdio: "ignore",
});
