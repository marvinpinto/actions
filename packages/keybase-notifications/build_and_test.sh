#!/usr/bin/env bash

set -e

npm ci
npm run prettier
npm run eslint
npm run build
npm test
