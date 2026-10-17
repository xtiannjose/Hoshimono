import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    // .env.test points tests at the hoshimono_test database.
    env: loadEnv("test", process.cwd(), ""),
    globalSetup: ["tests/db/global-setup.ts"],
    // Database tests share one database, so run files one at a time.
    fileParallelism: false,
  },
});
