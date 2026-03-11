#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Installing backend dependencies (uv) ==="
cd "$REPO_ROOT/apps/backend"
uv sync

echo ""
echo "=== Installing frontend dependencies (npm) ==="
cd "$REPO_ROOT/apps/frontend"
npm install

echo ""
echo "=== Setup complete ==="
