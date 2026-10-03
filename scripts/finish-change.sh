#!/usr/bin/env bash
# Shared last steps of the archive, restore and delete actions: rewrite the
# README's map table, commit both files to main, and tell the original
# submission issue (if one is found) what happened.
#   scripts/finish-change.sh "<commit message>" "<issue comment>" <tag> [<tag> …]
set -euo pipefail
message="$1"
comment="$2"
shift 2

node scripts/update-readme.mjs
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add basemaps.json README.md
if git diff --cached --quiet; then
  echo "Nothing changed in the list."
else
  git commit -m "$message"
  git push origin HEAD:main
fi

for tag in "$@"; do
  issue=$(gh api -X GET search/issues -f q="repo:$GITHUB_REPOSITORY is:issue \"Published as [$tag]\" in:comments" --jq '.items[0].number // empty' 2>/dev/null || true)
  if [ -n "$issue" ]; then
    gh issue comment "$issue" --body "$comment" > /dev/null || true
  fi
done
