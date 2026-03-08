# Sidequest

Minimal FastAPI backend plus Vite/React frontend.

## Structure

- `apps/backend`: FastAPI app managed with `uv`
- `apps/frontend`: Vite + React app

## Backend

Install dependencies:

```bash
cd apps/backend
uv sync
```

Run the API:

```bash
cd apps/backend
uv run uvicorn app.main:app --reload
```

The backend listens on `http://127.0.0.1:8000` and exposes `GET /api/health`.

## Frontend

Install dependencies:

```bash
cd apps/frontend
npm install
```

Run the dev server:

```bash
cd apps/frontend
npm run dev
```

The frontend listens on `http://127.0.0.1:5173` and proxies `/api` requests to the backend.

## Quick Start

1. Start the backend.
2. Start the frontend.
3. Open `http://127.0.0.1:5173`.
