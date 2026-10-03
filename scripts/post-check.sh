#!/usr/bin/env bash
# Posts a submission's check result on its issue: one comment, updated in place
# on every run, and the "checks passed" or "needs changes" label.
#   scripts/post-check.sh <issue number> <comment file> <passed|failed>
set -euo pipefail
issue="$1"
comment_file="$2"
status="$3"

gh label create "checks passed" --color 0e8a16 --description "The map passed the automatic checks" 2>/dev/null || true
gh label create "needs changes" --color d93f0b --description "The submission needs changes before review" 2>/dev/null || true
gh label create "approved" --color 1d76db --description "A maintainer approved this map; it is published automatically" 2>/dev/null || true
gh label create "map submission" --color 5319e7 --description "A request to add or update a detailed map" 2>/dev/null || true
gh issue edit "$issue" --add-label "map submission" > /dev/null 2>&1 || true

existing=$(gh api "repos/$GITHUB_REPOSITORY/issues/$issue/comments" --paginate \
  --jq '.[] | select(.user.login == "github-actions[bot]" and (.body | startswith("<!-- map-check"))) | .id' | head -n 1)
if [ -n "$existing" ]; then
  gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$existing" -F "body=@$comment_file" > /dev/null
else
  gh issue comment "$issue" --body-file "$comment_file" > /dev/null
fi

if [ "$status" = "passed" ]; then
  gh issue edit "$issue" --add-label "checks passed" --remove-label "needs changes" > /dev/null 2>&1 || gh issue edit "$issue" --add-label "checks passed" > /dev/null
else
  gh issue edit "$issue" --add-label "needs changes" --remove-label "checks passed" > /dev/null 2>&1 || gh issue edit "$issue" --add-label "needs changes" > /dev/null
fi
