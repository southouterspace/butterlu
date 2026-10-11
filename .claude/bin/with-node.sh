#!/bin/bash
# Runs a command on the Node major in .nvmrc, installing it from the npm
# registry if the container's node is older. MCP servers and hooks start with
# the container's PATH, so anything that needs Node 24 goes through here.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
want="$(cat "$root/.nvmrc")"
have="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"

if [ "$have" != "$want" ]; then
  dir="$HOME/.local/node$want"
  if [ ! -x "$dir/package/bin/node" ]; then
    # nodejs.org is outside the default network policy; the npm registry is not.
    tmp="$(mktemp -d)"
    tarball="$(cd "$tmp" && npm pack "node-linux-x64@$want" --silent | tail -n1)"
    tar xzf "$tmp/$tarball" -C "$tmp"
    mkdir -p "$dir"
    mv -T "$tmp/package" "$dir/package" 2>/dev/null || true
    rm -rf "$tmp"
  fi
  export PATH="$dir/package/bin:$PATH"
fi

exec "$@"
