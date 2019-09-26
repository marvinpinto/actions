#!/usr/bin/env bash

set -e

./scripts/install_keybase_binary.sh
npm ci
npm run prettier
npm run eslint
npm run build
npm test
