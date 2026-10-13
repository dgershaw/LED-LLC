#!/usr/bin/env bash
# Publish a sandbox commit as the live version: one commit on the `live` branch whose content is that commit's,
# in the approver's name, with a "Snapshot:" line the portal and roll-back.yml read. Used by approve.yml (now)
# and publish-scheduled.yml (at a chosen time). Run inside a checkout that has origin/main fetched.
#   tools/publish-live.sh "<name>" "<email>" "<note or empty>" [<sandbox commit, default origin/main>]
set -euo pipefail
NAME=$1; EMAIL=$2; NOTE=${3:-}; SNAP=$(git rev-parse "${4:-origin/main}")
export GIT_AUTHOR_NAME="$NAME" GIT_AUTHOR_EMAIL="$EMAIL"
export GIT_COMMITTER_NAME="Site publisher" GIT_COMMITTER_EMAIL="noreply@led-llc.com"
PARENT=()
if git fetch origin live:refs/remotes/origin/live 2>/dev/null; then
  PARENT=(-p origin/live)
  CUR=$(git log -1 --format=%B origin/live | sed -n 's/^Snapshot: //p' | head -1)
  [ -n "$CUR" ] || CUR=$(git rev-parse -q --verify origin/live^2 || true)
  if [ "$CUR" = "$SNAP" ]; then echo "The live site already matches that version; nothing to publish."; exit 0; fi
fi
MSG="Approved for the live site by $NAME"$'\n\n'
[ -z "$NOTE" ] || MSG="$MSG""Note: $NOTE"$'\n'
MSG="$MSG""Snapshot: $SNAP"
C=$(printf '%s\n' "$MSG" | git commit-tree "$SNAP^{tree}" "${PARENT[@]}")
git push origin "$C:refs/heads/live"
echo "Published $SNAP as the live version ($C)."
