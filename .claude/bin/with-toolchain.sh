#!/bin/bash
# Runs a command with the Node major in .nvmrc and the Bun version pinned by
# site/package.json's packageManager, installing either from the npm registry
# if the container's copy differs. MCP servers and hooks start with the
# container's PATH, so anything that needs the site toolchain goes through here.
# Bun installs packages and runs scripts; Node runs the code (e2e needs Node).
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"

# Unpacks an npm package into $1/package once. nodejs.org and bun.sh are
# outside the default network policy; the npm registry is not.
fetch() {
  local dir="$1" pkg="$2" tmp tarball
  [ ! -d "$dir/package" ] || return 0
  tmp="$(mktemp -d)"
  tarball="$(cd "$tmp" && npm pack "$pkg" --silent | tail -n1)"
  tar xzf "$tmp/$tarball" -C "$tmp"
  mkdir -p "$dir"
  mv -T "$tmp/package" "$dir/package" 2>/dev/null || true
  rm -rf "$tmp"
}

want_node="$(cat "$root/.nvmrc")"
have_node="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$have_node" != "$want_node" ]; then
  fetch "$HOME/.local/node$want_node" "node-linux-x64@$want_node"
  export PATH="$HOME/.local/node$want_node/package/bin:$PATH"
fi

want_bun="$(node -p 'require(process.argv[1]).packageManager.split("bun@")[1]' "$root/site/package.json")"
have_bun="$(bun --version 2>/dev/null || true)"
if [ "$have_bun" != "$want_bun" ]; then
  fetch "$HOME/.local/bun$want_bun" "@oven/bun-linux-x64@$want_bun"
  chmod +x "$HOME/.local/bun$want_bun/package/bin/bun"
  export PATH="$HOME/.local/bun$want_bun/package/bin:$PATH"
fi

exec "$@"
