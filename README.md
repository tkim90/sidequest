# Sidequest

Fork side bars into separate chats without disrupting your main conversation flow.

<img width="1982" height="1323" alt="CleanShot 2026-03-09 at 22 03 25" src="https://github.com/user-attachments/assets/61426cb2-fc0d-4bb7-8d88-ef06cae32e2e" />

It also uses `json-render` to let LLMs reliably call your custom React components like this `AlgorithmVisualizer`!

<img width="1339" height="1256" alt="CleanShot 2026-03-09 at 22 28 24" src="https://github.com/user-attachments/assets/34be5779-4eb1-4140-a737-d24b992cb8ea" />

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
export OPENAI_MODEL_OPTIONS=gpt-4.1-mini,gpt-4.1,gpt-4o-mini
```

Run the API:

```bash
cd apps/backend
uv run uvicorn app.main:app --reload
```

The backend listens on `http://127.0.0.1:8000` and exposes:

- `GET /api/health`
- `GET /api/chat/models`
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
- Per-window model picker with backend-driven model options
- Model badge on assistant responses
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
