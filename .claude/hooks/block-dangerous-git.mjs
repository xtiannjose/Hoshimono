// PreToolUse guard for agent shell commands (Bash and PowerShell tools).
// Exit 2 blocks the command; the agent sees the stderr message.
// Pushing is allowed only as `git push [-u] origin <feature-branch>`.
// Merging pull requests stays with the user.

const BLOCKED = [
  [/\bgit\s+reset\s+--hard\b/, "git reset --hard"],
  [/\bgit\s+clean\s+-\w*f/, "git clean -f"],
  [/\bgit\s+branch\s+-D\b/, "git branch -D"],
  [/\bgit\s+checkout\s+\.(\s|$)/, "git checkout ."],
  [/\bgit\s+restore\s+\.(\s|$)/, "git restore ."],
  [/\bgh\s+pr\s+merge\b/, "gh pr merge (the user merges)"],
];

// `git push`, also with global options such as `git -C dir push`.
const PUSH = /\bgit(?:\s+-\S+(?:\s+[^\s-]\S*)?)*\s+push\b/;
const PROTECTED = new Set(["main", "master", "HEAD"]);

function pushAllowed(segment) {
  const tokens = segment.trim().split(/\s+/);
  let i = 0;
  if (tokens[i++] !== "git" || tokens[i++] !== "push") return false;
  if (tokens[i] === "-u" || tokens[i] === "--set-upstream") i++;
  if (tokens[i++] !== "origin") return false;
  const branch = tokens[i++];
  if (i !== tokens.length || !branch) return false;
  return (
    /^[\w./-]+$/.test(branch) &&
    !branch.startsWith("-") &&
    !branch.startsWith("refs/") &&
    !PROTECTED.has(branch.split("/").pop())
  );
}

function check(command) {
  for (const [pattern, name] of BLOCKED) {
    if (pattern.test(command)) return `matches dangerous pattern '${name}'`;
  }
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    if (PUSH.test(segment) && !pushAllowed(segment)) {
      return "pushes are allowed only as 'git push [-u] origin <feature-branch>'";
    }
  }
  return null;
}

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let command;
  try {
    command = String(JSON.parse(input).tool_input?.command ?? "");
  } catch {
    console.error("BLOCKED: could not parse hook input, refusing to run.");
    process.exit(2);
  }
  const reason = check(command);
  if (reason) {
    console.error(
      `BLOCKED: '${command}' ${reason}. The user has prevented you from doing this.`
    );
    process.exit(2);
  }
  process.exit(0);
});
