#!/usr/bin/env sh
set -eu
npm install
npm test
npm run build
