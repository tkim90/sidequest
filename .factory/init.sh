#!/bin/sh
set -eu

if [ ! -d "apps/frontend/node_modules" ]; then
  npm --prefix apps/frontend install
fi
