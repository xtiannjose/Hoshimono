import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Modules own their internals: import another module only through its
// index.ts. shortcut: relative cross-module imports are only caught up to
// three levels deep, upgrade to eslint-plugin-boundaries if modules nest more.
export const moduleBoundary = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: [
            "**/modules/*/internal",
            "**/modules/*/internal/**",
            "../*/internal/**",
            "../../*/internal/**",
            "../../../*/internal/**",
          ],
          message:
            "Import another module only through its index.ts. Inside a module, use a relative path to its own internal/.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { rules: moduleBoundary },
  // Shop links keep the shopper's language (ADR 0017).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/admin/**", "src/components/link.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          ...moduleBoundary["no-restricted-imports"][1],
          paths: [
            {
              name: "next/link",
              message:
                "Use Link from @/components/link: it keeps the shopper's language.",
            },
          ],
        },
      ],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "docs/**",
    "src/generated/**",
    // Agents' git worktrees: copies of the repo, linted in their own checkout.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
