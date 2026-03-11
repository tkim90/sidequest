#!/bin/sh
set -e

# Railway injects PORT; nginx listens on it
NGINX_PORT="${PORT:-8080}"
export NGINX_PORT

# Generate nginx config from template
envsubst '${NGINX_PORT}' < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Start backend (FastAPI via uvicorn)
/app/backend/.venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 --port 8000 \
  --app-dir /app/backend &
BACKEND_PID=$!

# Start image service (Node.js)
PORT=3001 node --import tsx /app/image-service/src/server.tsx &
IMAGE_PID=$!

# Start nginx (foreground, but backgrounded here so we can wait)
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "sidequest: backend=$BACKEND_PID image=$IMAGE_PID nginx=$NGINX_PID port=$NGINX_PORT"

# If any process exits, shut everything down
wait -n "$BACKEND_PID" "$IMAGE_PID" "$NGINX_PID" 2>/dev/null || true
echo "A process exited unexpectedly, shutting down..."
kill "$BACKEND_PID" "$IMAGE_PID" "$NGINX_PID" 2>/dev/null || true
exit 1
