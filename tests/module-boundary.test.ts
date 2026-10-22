import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function violations(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.ruleId === "no-restricted-imports");
}

// The first ESLint run loads the full Next config and is slow.
describe("module boundary lint rule", { timeout: 120_000 }, () => {
  it("blocks alias imports into another module's internal/", async () => {
    const found = await violations(
      "src/app/[lang]/page.tsx",
      'import { x } from "@/modules/catalog/internal/queries";\nexport default x;\n'
    );
    expect(found).toHaveLength(1);
  });

  it("blocks relative imports into a sibling module's internal/", async () => {
    const found = await violations(
      "src/modules/cart/index.ts",
      'import { x } from "../catalog/internal/queries";\nexport default x;\n'
    );
    expect(found).toHaveLength(1);
  });

  it("allows a module to use its own internal/ and other modules' index", async () => {
    const own = await violations(
      "src/modules/cart/index.ts",
      'import { x } from "./internal/cart";\nexport default x;\n'
    );
    const other = await violations(
      "src/modules/cart/index.ts",
      'import { y } from "@/modules/catalog";\nexport default y;\n'
    );
    expect(own).toHaveLength(0);
    expect(other).toHaveLength(0);
  });
});
