// Runs the agent git guardrail the way Claude Code does: hook JSON on stdin,
// exit 0 allows, exit 2 blocks. Agent tooling, so not in the app suite:
// npm run test:hooks
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

const HOOK = ".claude/hooks/block-dangerous-git.sh";

const exitCode = (input) => spawnSync("bash", [HOOK], { input }).status;
const run = (command) => exitCode(JSON.stringify({ tool_input: { command } }));

describe("agent git guardrail", () => {
  it("allows pushing a named feature branch to origin", () => {
    for (const command of [
      "git push -u origin phase-0/foundation",
      "git push origin phase-1/catalogue",
      "git status",
      'git commit -m "docs: push notes"',
    ]) {
      assert.equal(run(command), 0, command);
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
      assert.equal(run(command), 2, command);
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
      assert.equal(run(command), 2, command);
    }
  });

  it("fails closed on input it cannot read", () => {
    assert.equal(exitCode("garbage"), 2);
  });
});
