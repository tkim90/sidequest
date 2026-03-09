# Sidequest

Branchable LLM chat workspace built with FastAPI plus Vite/React.

## Structure

- `apps/backend`: FastAPI app managed with `uv`
- `apps/frontend`: Vite + React infinite-canvas UI

## Backend

Install dependencies:

```bash
cd apps/backend
uv sync
```

Set environment variables before running:

```bash
export OPENAI_API_KEY=your_key_here
export OPENAI_MODEL=your_model_here
```

Run the API:

```bash
cd apps/backend
uv run uvicorn app.main:app --reload
```

The backend listens on `http://127.0.0.1:8000` and exposes:

- `GET /api/health`
- `POST /api/chat/stream`

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

## Features

- Pannable and zoomable infinite canvas
- Multiple draggable chat windows
- Streaming model responses
- Phrase-level branching from any completed user or assistant message
- Recursive child chats with inherited parent history snapshots
- Connector lines from the anchored phrase to the child chat window
- Cascade-close confirmation when a parent has descendants

## Quick Start

1. Start the backend.
2. Start the frontend.
3. Open `http://127.0.0.1:5173`.
4. Send a message in `Chat 1`.
5. Highlight a phrase in any completed message and click `Branch`.
