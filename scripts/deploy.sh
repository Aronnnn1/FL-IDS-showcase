#!/usr/bin/env bash
# Build the site and publish dist/ to the gh-pages branch (GitHub Pages serves that branch).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
url=$(git remote get-url origin)
tmp=$(mktemp -d)
cp -r dist/. "$tmp"/
touch "$tmp/.nojekyll"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C - config user.name 2>/dev/null || echo deploy)" commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)" || true
git remote add origin "$url"
git push -f origin gh-pages
echo "Published. Live at https://aronnnn1.github.io/FL-IDS-showcase/"
