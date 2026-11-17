#!/usr/bin/env bash
# Cloudflare Pages' build of the site (David, 2026-11-13). Two Cloudflare Pages projects run this same script, each
# after every push to its own branch, and each swaps its site in one step, so a visitor never sees a half-published one:
#   the sandbox project builds `main`: the sandbox at the root and the administration portal at /admin/
#   the live project builds `live`:    the live site at the root
# In both projects the build command is `bash tools/cloudflare-build.sh` and the output directory is `_site`.
# tools/hosting.json holds the two addresses. Optional, in the live project's settings only: SANDBOX_DEPLOY_HOOK, a
# deploy hook of the sandbox project, so the portal shows an approval right away. Never write that address in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
BRANCH=${CF_PAGES_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}
python3 -m pip install -q jinja2==3.1.6 markupsafe==3.0.3 pillow==12.3.0 qrcode==8.0

address() {   # address <key> [own]: the address in tools/hosting.json; with "own", else this project's (CF_PAGES_URL without the deployment id)
  python3 - "$@" <<'PY'
import json, os, re, sys
try:
    url = json.load(open("tools/hosting.json")).get(sys.argv[1], "")
except (OSError, ValueError):
    url = ""
print(url or (re.sub(r"^(https://)[0-9a-f]+\.", r"\1", os.environ.get("CF_PAGES_URL", "")) if sys.argv[2:] else ""))
PY
}

copy_site() {   # the built pages and their files, without the sources: copy_site <from> <to>
  mkdir -p "$2"
  tar -C "$1" --exclude=./.git --exclude=./.github --exclude=./.cloudcannon --exclude=./tools --exclude=./data --exclude=./content \
      --exclude=./notes --exclude=./_site --exclude=./node_modules --exclude=./README.md --exclude=./.pages.yml \
      --exclude=./cloudcannon.config.yml --exclude=./.gitignore --exclude=./TEST_COPY --exclude=./CLAUDE.md -cf - . | tar -xf - -C "$2"
}

rm -rf _site
if [ "$BRANCH" = live ]; then
  SITE_BASE_URL=$(address live_url own) python3 tools/build.py
  copy_site . _site
  if [ -n "${SANDBOX_DEPLOY_HOOK:-}" ]; then
    curl -fsS -X POST "$SANDBOX_DEPLOY_HOOK" -o /dev/null && echo "Asked the sandbox project to rebuild the portal." \
      || echo "The sandbox project could not be reached; the portal catches up on the next sandbox change."
  fi
  echo "Live site built in _site/"
  exit 0
fi

# The sandbox and the portal. The portal reads the whole history of both branches and compares the two built copies,
# so the live version is built too (in a scratch folder; it is not published from here).
git fetch -q --unshallow origin 2>/dev/null || true
git fetch -q origin '+refs/heads/live:refs/remotes/origin/live' 2>/dev/null && LIVE=origin/live || LIVE=HEAD
git fetch -q origin '+refs/heads/schedule:refs/remotes/origin/schedule' 2>/dev/null || true
git rev-parse -q --verify refs/heads/main >/dev/null || git branch -q main HEAD   # the portal lists what `main` has that live has not
WORK=$(mktemp -d)
git worktree prune
git worktree add -q --detach "$WORK/live" "$LIVE"
(cd "$WORK/live" && SITE_BASE_URL=$(cd "$ROOT" && address live_url) python3 tools/build.py)
export SANDBOX_URL; SANDBOX_URL=$(address sandbox_url own)
SITE_BASE_URL=$SANDBOX_URL python3 tools/build.py
copy_site "$WORK/live" "$WORK/out"
copy_site . "$WORK/out/sandbox"
python3 tools/portal.py --main . --live "$WORK/live" --out "$WORK/out"
mv "$WORK/out/sandbox" _site
mv "$WORK/out/admin" _site/admin
printf 'User-agent: *\nDisallow: /\n' > _site/robots.txt
git worktree remove --force "$WORK/live" || true
echo "Sandbox and portal built in _site/"
