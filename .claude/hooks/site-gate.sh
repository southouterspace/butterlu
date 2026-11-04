#!/bin/bash
# CI for agent sessions. Registered for Bash in .claude/settings.json.
#   pre:  blocks direct wrangler deploys, and runs `bun run validate` before a
#         `git push` that changes apps/, packages/ or the root workspace files.
#         A failed check blocks the push.
#   post: work goes straight to main in small validated commits (CLAUDE.md 6a).
#         A push to main is deployed to stage by GitHub Actions (stage.yml), not
#         here. A push of any other branch deploys that branch's Preview, when
#         this environment has a token. Production is never deployed from here:
#         only a published GitHub Release does that (release.yml).
set -uo pipefail

phase="$1"
cmd="$(jq -r '.tool_input.command // ""')"
cd "$CLAUDE_PROJECT_DIR"
toolchain="$CLAUDE_PROJECT_DIR/.claude/bin/with-toolchain.sh"
watched=(apps packages package.json bun.lock .nvmrc)
preview_watched=(apps/site packages package.json bun.lock .nvmrc)

changed_in() {
  git fetch --quiet origin main 2>/dev/null
  ! git diff --quiet "$(git merge-base HEAD origin/main)" HEAD -- "$@"
}

workspace_changed() { changed_in "${watched[@]}"; }
preview_changed() { changed_in "${preview_watched[@]}"; }

# Unanchored on purpose: env prefixes, `git -C dir push`, `bunx wrangler`,
# `bash -c '...'` and newline-separated commands must all match. A doc line
# that mentions these inside a heredoc matches too; write docs with Write/Edit.
# Between git and push only global options may appear (`-C dir`, `-c k=v`),
# so `git commit -m "... push ..."` does not count as a push.
re_push='(^|[^[:alnum:]_.-])git([[:blank:]]+-[^[:space:]]+([[:blank:]]+[^-[:space:]][^[:space:]]*)?)*[[:blank:]]+push([^[:alnum:]_-]|$)'
re_push_delete='[[:space:]](--delete|-d)([[:space:]]|$)'
re_deploy='(^|[^[:alnum:]_-])wrangler(@[^[:space:]]*)?[[:space:]]+(deploy|versions|rollback|delete|secret|preview)([^[:alnum:]_-]|$)'
re_preview_delete='wrangler(@[^[:space:]]*)?[[:space:]]+preview[[:space:]]+delete'
re_prod_script='deploy(:|\.mjs[[:space:]]+)production'

is_push() {
  [[ "$cmd" =~ $re_push ]] && [[ ! "$cmd" =~ $re_push_delete ]]
}

is_direct_deploy() {
  { [[ "$cmd" =~ $re_deploy ]] && [[ ! "$cmd" =~ $re_preview_delete ]]; } || [[ "$cmd" =~ $re_prod_script ]]
}

if [ "$phase" = pre ]; then
  if is_direct_deploy; then
    echo "Deploy through apps/site/scripts/deploy.mjs: bun run deploy:preview or bun run deploy:stage (from apps/site, on main). Production deploys only from a published GitHub Release." >&2
    exit 2
  fi
  if is_push && workspace_changed; then
    # Validate what is pushed, not what is on disk.
    if [ -n "$(git status --porcelain -- "${watched[@]}")" ]; then
      echo "Push blocked: apps/, packages/ or the root workspace files have uncommitted changes. Commit or stash them so validation runs on what you push. This check runs before the whole command, so commit in one command and push in the next." >&2
      exit 2
    fi
    if ! out="$("$toolchain" bun run validate 2>&1)"; then
      printf 'Push blocked: bun run validate failed at the repo root.\n%s\n' "$(tail -n 40 <<<"$out")" >&2
      exit 2
    fi
  fi
  exit 0
fi

# post
is_push || exit 0
branch="$(git rev-parse --abbrev-ref HEAD)"
# origin/main moved to HEAD (from main, or via HEAD:main): Actions deploys stage.
if [ "$(git rev-parse HEAD)" = "$(git rev-parse refs/remotes/origin/main 2>/dev/null)" ]; then
  msg="Pushed to main. If the push changed apps/, packages/, assets/, plans/ or the root package files, GitHub Actions deploys stage and e2e-tests it (.github/workflows/stage.yml; docs-only pushes skip it). Check the run with: gh run list --workflow stage.yml --limit 1, and report the stage url and e2e result from it."
  jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
  exit 0
fi
[ "$branch" != main ] || exit 0
target=preview
preview_changed || exit 0
stamp="$(git rev-parse --git-dir)/butterlu-$target-$(tr / - <<<"$branch")"
[ "$(cat "$stamp" 2>/dev/null)" != "$(git rev-parse HEAD)" ] || exit 0
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "refs/remotes/origin/$branch" 2>/dev/null)" ]; then
  msg="No $target deploy: HEAD is not on origin/$branch after this push. Push the branch itself (git push -u origin HEAD) to get one."
  jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
  exit 0
fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  msg="No $target deploy: CLOUDFLARE_API_TOKEN is not set in this Claude environment. Tell the user once (apps/site/README.md, one-time setup); do not work around it."
else
  out="$(cd apps/site && "$toolchain" bun run "deploy:$target" 2>&1)"
  summary="$(sed -n 's/^deploy-summary //p' <<<"$out")"
  if [ -n "$summary" ]; then
    git rev-parse HEAD > "$stamp"
    msg="Deployed $target for $branch: $summary. Report the url and e2e result to the user. health=unreachable means the sandbox cannot reach *.workers.dev; say it was not e2e-tested from here."
  elif blocked="$(sed -n 's/^deploy-setup-blocked: //p' <<<"$out")" && [ -n "$blocked" ]; then
    msg="No $target deploy: $blocked. This is owner setup. Tell the user once and do not work around it: never pin, borrow or switch to another project's Cloudflare account or token."
  else
    msg="$(printf '%s deploy failed for %s. Fix it with a follow-up commit. Last output:\n%s' "$target" "$branch" "$(tail -n 30 <<<"$out")")"
  fi
fi
jq -n --arg m "$msg" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
