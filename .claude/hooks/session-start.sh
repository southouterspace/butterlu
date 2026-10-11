#!/bin/bash
# Gives cloud sessions what CI has: Node from .nvmrc and site/ dependencies,
# so `npm run validate` in site/ works before the first prompt.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
want="$(cat .nvmrc)"
have="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"

if [ "$have" != "$want" ]; then
  # nodejs.org is outside the default network policy; the npm registry is not.
  dir="$HOME/.local/node$want"
  if [ ! -x "$dir/package/bin/node" ]; then
    mkdir -p "$dir"
    tarball="$(cd "$dir" && npm pack "node-linux-x64@$want" --silent | tail -n1)"
    tar xzf "$dir/$tarball" -C "$dir"
    rm "$dir/$tarball"
  fi
  export PATH="$dir/package/bin:$PATH"
  echo "export PATH=\"$dir/package/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

echo 'export E2E_TELEMETRY_DISABLED=1' >> "$CLAUDE_ENV_FILE"

cd site
npm install --no-audit --no-fund
