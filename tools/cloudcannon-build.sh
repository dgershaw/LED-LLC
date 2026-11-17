# CloudCannon's build of the site for its visual editor (David, 2026-11-03); .cloudcannon/initial-site-settings.json runs it.
# The same build as the sandbox in deploy.yml, copied to _site/ without the sources. CloudCannon only previews it;
# visitors still get the GitHub Pages build of `main` (sandbox) and `live`.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/build.py
rm -rf _site && mkdir _site
tar --exclude=./.git --exclude=./.github --exclude=./.cloudcannon --exclude=./tools --exclude=./data --exclude=./content \
    --exclude=./notes --exclude=./_site --exclude=./node_modules --exclude=./README.md --exclude=./.pages.yml \
    --exclude=./cloudcannon.config.yml --exclude=./.gitignore --exclude=./TEST_COPY --exclude=./CLAUDE.md -cf - . | tar -xf - -C _site
printf 'User-agent: *\nDisallow: /\n' > _site/robots.txt
echo "CloudCannon preview built in _site/"
