# Rebuilds assets/js/editable-regions.js, CloudCannon's visual-editing layer (David, 2026-11-03).
# The pages load it only inside CloudCannon's editor (window.inEditorMode), so visitors never download it.
# Run as `bash tools/bundle-editable-regions.sh` after changing the version below; needs Node and network access to npm.
set -euo pipefail
VERSION=0.0.22   # @cloudcannon/editable-regions; the next three are the versions it was built and tested with
DEPS="@cloudcannon/visual-editor-api@0.0.20 js-beautify@2.0.3 esbuild@0.28.2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund "@cloudcannon/editable-regions@$VERSION" $DEPS
echo 'import "@cloudcannon/editable-regions/internal/components";' > entry.js
# The package imports its styles as "x.css?inline" (a text string for its own shadow DOM), so they never touch the site's CSS.
cat > build.mjs <<JS
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
const inlineCss = { name: "inline-css", setup(b) {
  b.onResolve({ filter: /\\.css\\?inline\$/ }, (a) => ({ path: path.resolve(a.resolveDir, a.path.replace(/\\?inline\$/, "")), namespace: "inline-css" }));
  b.onLoad({ filter: /.*/, namespace: "inline-css" }, async (a) => ({ contents: await readFile(a.path, "utf8"), loader: "text" }));
} };
await build({ entryPoints: ["entry.js"], bundle: true, minify: true, format: "esm", target: "es2020", logLevel: "warning",
  plugins: [inlineCss], banner: { js: "/* @cloudcannon/editable-regions $VERSION (MIT), bundled by tools/bundle-editable-regions.sh */" },
  outfile: "$ROOT/assets/js/editable-regions.js" });
JS
node build.mjs
test ! -e "$ROOT/assets/js/editable-regions.css"
echo "wrote assets/js/editable-regions.js"
