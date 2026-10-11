#!/usr/bin/env bash
# Usage: sticky-comment.sh <pr-number> <marker> <body-file>
# Creates the comment carrying <marker>, or edits it in place on later runs.
set -euo pipefail
pr="$1" marker="$2" body_file="$3"
body="$(printf '<!-- %s -->\n%s' "$marker" "$(cat "$body_file")")"
id="$(gh api "repos/$GITHUB_REPOSITORY/issues/$pr/comments" --paginate \
  --jq ".[] | select(.body | startswith(\"<!-- $marker -->\")) | .id" | head -n1)"
if [ -n "$id" ]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" -f body="$body" >/dev/null
else
  gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$pr/comments" -f body="$body" >/dev/null
fi
