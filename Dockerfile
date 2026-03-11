# =============================================================================
# Stage 1: Build frontend static assets
# =============================================================================
FROM node:22-slim AS frontend-build

WORKDIR /app/apps/frontend
COPY apps/frontend/package.json apps/frontend/package-lock.json ./
RUN npm ci

COPY apps/frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: Install image-service production dependencies
# =============================================================================
FROM node:22-slim AS image-deps

WORKDIR /app/apps/image-service
COPY apps/image-service/package.json apps/image-service/package-lock.json ./
RUN npm ci --omit=dev

# =============================================================================
# Stage 3: Install backend Python dependencies
# =============================================================================
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS backend-build

WORKDIR /app/apps/backend
COPY apps/backend/pyproject.toml apps/backend/uv.lock ./
RUN uv sync --frozen --no-dev

# =============================================================================
# Stage 4: Runtime — all services in one container
# =============================================================================
FROM python:3.13-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx gettext-base && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/nginx/sites-enabled/default

# Copy Node.js binary from the node image
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

# Frontend static files
COPY --from=frontend-build /app/apps/frontend/dist /srv/frontend

# Image service (source + production node_modules with geist fonts)
COPY apps/image-service/src /app/image-service/src
COPY apps/image-service/tsconfig.json /app/image-service/
COPY apps/image-service/package.json /app/image-service/
COPY --from=image-deps /app/apps/image-service/node_modules /app/image-service/node_modules

# Backend (app code + virtual environment)
COPY apps/backend/app /app/backend/app
COPY --from=backend-build /app/apps/backend/.venv /app/backend/.venv

# Deployment config
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8080

CMD ["sh", "/app/start.sh"]
