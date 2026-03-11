#!/bin/sh
set -e

IMAGE_NAME="sidequest-test"
CONTAINER_NAME="sidequest-test-run"
PORT=8080
BASE_URL="http://localhost:$PORT"
PASSED=0
FAILED=0

cleanup() {
  echo ""
  echo "Cleaning up..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

pass() {
  PASSED=$((PASSED + 1))
  echo "  PASS: $1"
}

fail() {
  FAILED=$((FAILED + 1))
  echo "  FAIL: $1"
}

# ---- Build ----
echo "==> Building Docker image..."
if docker build -t "$IMAGE_NAME" .; then
  pass "Docker build succeeded"
else
  fail "Docker build failed"
  echo "Cannot continue without a successful build."
  exit 1
fi

# ---- Start container ----
echo "==> Starting container..."
docker run -d --name "$CONTAINER_NAME" \
  -p "$PORT:$PORT" \
  -e PORT="$PORT" \
  -e OPENAI_API_KEY="test-key" \
  -e OPENAI_MODEL="test-model" \
  "$IMAGE_NAME"

# Wait for services to be ready
echo "==> Waiting for services to start..."
RETRIES=20
until curl -sf "$BASE_URL/api/health" > /dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    fail "Services did not start within timeout"
    echo "Container logs:"
    docker logs "$CONTAINER_NAME"
    exit 1
  fi
  sleep 1
done
echo "==> Services are up."

# ---- Tests ----
echo ""
echo "==> Running tests..."

# 1. Health check
HEALTH=$(curl -sf "$BASE_URL/api/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  pass "GET /api/health returns ok"
else
  fail "GET /api/health unexpected response: $HEALTH"
fi

# 2. Frontend serves index.html
INDEX=$(curl -sf "$BASE_URL/")
if echo "$INDEX" | grep -q '<div id="root"'; then
  pass "GET / serves frontend index.html"
else
  fail "GET / did not return expected HTML"
fi

# 3. SPA fallback
SPA=$(curl -sf "$BASE_URL/some/random/path")
if echo "$SPA" | grep -q '<div id="root"'; then
  pass "GET /some/random/path returns index.html (SPA fallback)"
else
  fail "SPA fallback not working"
fi

# 4. Models endpoint
MODELS=$(curl -sf "$BASE_URL/api/chat/models")
if echo "$MODELS" | grep -q '"models"'; then
  pass "GET /api/chat/models returns models JSON"
else
  fail "GET /api/chat/models unexpected response: $MODELS"
fi

# 5. Image service
SVG=$(curl -sf -X POST "$BASE_URL/api/image" \
  -H "Content-Type: application/json" \
  -d '{"spec":{"root":"f","elements":{"f":{"type":"Frame","props":{"background":"#fff"}}}}}')
if echo "$SVG" | grep -q '<svg'; then
  pass "POST /api/image returns SVG"
else
  fail "POST /api/image unexpected response: $SVG"
fi

# ---- Summary ----
echo ""
echo "==> Results: $PASSED passed, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
  echo "Container logs:"
  docker logs "$CONTAINER_NAME"
  exit 1
fi

echo "All tests passed!"
