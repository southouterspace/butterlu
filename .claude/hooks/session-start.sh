#!/bin/bash
# Gives cloud sessions what the release workflow has: Node from .nvmrc and
# site/ dependencies, so `npm run validate` works before the first prompt.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Cloud sessions ignore plugins a repo enables in .claude/settings.json, so
# install pstack here when the environment's setup script has not. A session
# that installs it here loads it on the next start or after /reload-plugins.
if ! claude plugin list 2>/dev/null | grep -q 'pstack@pstack-claude'; then
  claude plugin install pstack --marketplace michael-denyer/pstack-claude --scope user >&2 \
    || echo "pstack install failed; add it to the environment's setup script" >&2
fi

node_bin="$(.claude/bin/with-node.sh sh -c 'dirname "$(command -v node)"')"
{
  echo "export PATH=\"$node_bin:\$PATH\""
  echo 'export E2E_TELEMETRY_DISABLED=1'
} >> "$CLAUDE_ENV_FILE"

cd site
../.claude/bin/with-node.sh npm install --no-audit --no-fund
