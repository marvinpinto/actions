#!/usr/bin/env bash

set -e

if [[ $# -ne 1 ]]; then
  echo "This needs a release version. e.g. $0 v0.0.1"
  exit 1
fi

git checkout -b releases/$1
rm -rf node_modules
npm ci
npm run build
npm test
git add -f dist/index.js
git commit -m "Update dist/index.js for $1"
git push origin :refs/tags/$1
git tag -fa $1 -m "Release $1"
git push origin $1
git checkout master
git branch -D releases/$1
