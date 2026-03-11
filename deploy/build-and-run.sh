#!/bin/sh
set -e

echo "Building sidequest Docker image..."
docker build -t sidequest .

echo "Running sidequest on http://localhost:8080"
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
  -e OPENAI_MODEL="${OPENAI_MODEL:-gpt-4o}" \
  -e OPENAI_MODEL_OPTIONS="${OPENAI_MODEL_OPTIONS:-}" \
  sidequest
