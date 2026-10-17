import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

// Runs the agent git guardrail the way Claude Code does: hook JSON on stdin,
// exit 0 allows, exit 2 blocks.
const HOOK = ".claude/hooks/block-dangerous-git.sh";

function exitCode(input: string) {
  return spawnSync("bash", [HOOK], { input }).status;
}
const run = (command: string) =>
  exitCode(JSON.stringify({ tool_input: { command } }));

describe("agent git guardrail", () => {
  it("allows pushing a named feature branch to origin", () => {
    for (const command of [
      "git push -u origin phase-0/foundation",
      "git push origin phase-1/catalogue",
      "git status",
      'git commit -m "docs: push notes"',
    ]) {
      expect(run(command), command).toBe(0);
    }
  });

  it("blocks pushes to main, force pushes, deletes and implicit targets", () => {
    for (const command of [
      "git push",
      "git push origin main",
      "git push -u origin master",
      "git push origin HEAD",
      "git push --force origin x",
      "git push -f origin x",
      "git push origin +x",
      "git push origin x:main",
      "git push origin refs/heads/main",
      "git push origin --delete x",
      "git push origin :x",
      "git push --all origin",
      "git checkout main && git push",
      "git -C . push origin main",
      "git push origin x && git push origin main",
    ]) {
      expect(run(command), command).toBe(2);
    }
  });

  it("blocks destructive commands and merging pull requests", () => {
    for (const command of [
      "git reset --hard HEAD",
      "git clean -fd",
      "git branch -D x",
      "git restore .",
      "git checkout .",
      "gh pr merge 1 --squash",
    ]) {
      expect(run(command), command).toBe(2);
    }
  });

  it("fails closed on input it cannot read", () => {
    expect(exitCode("garbage")).toBe(2);
  });
});
