#!/bin/bash
# Hook entry point (the registered command path never changes). The rules live
# in block-dangerous-git.mjs. Fails closed: any error, or no node, blocks.

if ! command -v node >/dev/null 2>&1; then
  echo "BLOCKED: node is not available to check this command." >&2
  exit 2
fi

node "$(dirname "$0")/block-dangerous-git.mjs" && exit 0
exit 2
