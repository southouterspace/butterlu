#!/bin/bash
# Gives cloud sessions what the release workflow has: Node from .nvmrc and
# site/ dependencies, so `npm run validate` works before the first prompt.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
node_bin="$(.claude/bin/with-node.sh sh -c 'dirname "$(command -v node)"')"
{
  echo "export PATH=\"$node_bin:\$PATH\""
  echo 'export E2E_TELEMETRY_DISABLED=1'
} >> "$CLAUDE_ENV_FILE"

cd site
../.claude/bin/with-node.sh npm install --no-audit --no-fund
