#!/bin/bash
# Starts the e2e MCP server. On a fresh container the SessionStart hook may
# still be installing workspace dependencies, so wait for the e2e binary first.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
for _ in $(seq 1 150); do
  [ -x "$root/node_modules/.bin/e2e" ] && break
  sleep 2
done
cd "$root"
exec "$root/.claude/bin/with-toolchain.sh" "$root/node_modules/.bin/e2e" mcp --config apps/site/e2e.config.ts
