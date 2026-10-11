#!/bin/bash
# CI for agent sessions. Registered for Bash in .claude/settings.json.
#   pre:  blocks direct wrangler deploys, and runs `npm run validate` before a
#         `git push` that changes the site. A failed check blocks the push.
#   post: after a branch push lands, deploys its Preview and e2e-tests it,
#         then hands the result back to the agent to post on the PR.
set -uo pipefail

phase="$1"
cmd="$(jq -r '.tool_input.command // ""')"
cd "$CLAUDE_PROJECT_DIR"
node=(.claude/bin/with-node.sh)

site_changed() {
  git fetch --quiet origin main 2>/dev/null
  ! git diff --quiet "$(git merge-base HEAD origin/main)" HEAD -- site .nvmrc
}

# A command starts at the beginning of the string or after ; & |, so a doc
# line that mentions these commands inside a heredoc does not match.
start='(^|[;&|][[:space:]]*)'

is_push() {
  [[ "$cmd" =~ ${start}git[[:space:]]+push([[:space:]]|$) ]] && [[ ! "$cmd" =~ --delete ]]
}

if [ "$phase" = pre ]; then
  if [[ "$cmd" =~ ${start}(npx[[:space:]]+)?wrangler[[:space:]]+(deploy|versions|rollback|delete|secret|preview([[:space:]]|$)) ]] \
    && [[ ! "$cmd" =~ wrangler[[:space:]]+preview[[:space:]]+delete ]]; then
    echo "Deploy through site/scripts/deploy.mjs: npm run deploy:preview or npm run deploy:stage (from main). Production deploys only from a published GitHub Release." >&2
    exit 2
  fi
  if is_push && site_changed; then
    if ! out="$(cd site && "../${node[0]}" npm run validate 2>&1)"; then
      printf 'Push blocked: npm run validate failed in site/.\n%s\n' "$(tail -n 40 <<<"$out")" >&2
      exit 2
    fi
  fi
  exit 0
fi

# post
is_push || exit 0
branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" != main ] || exit 0
[ "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}' 2>/dev/null)" ] || exit 0
site_changed || exit 0

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  msg="No Preview: CLOUDFLARE_API_TOKEN is not set in this Claude environment. Tell the user once (site/README.md, one-time setup); do not work around it."
else
  out="$(cd site && "../${node[0]}" npm run deploy:preview 2>&1)"
  summary="$(sed -n 's/^deploy-summary //p' <<<"$out")"
  if [ -n "$summary" ]; then
    msg="Preview deployed for $branch: $summary. Post the url and e2e result on this branch's PR (one comment, edited on later pushes). health=unreachable means the sandbox cannot reach *.workers.dev; say the Preview was not e2e-tested from here."
  else
    msg="Preview deploy failed for $branch. Fix it before asking for review. Last output:\n$(tail -n 30 <<<"$out")"
  fi
fi
jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
