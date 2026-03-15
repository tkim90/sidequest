# Sidequest

Fork side bars into separate chats without disrupting your main conversation flow.

<img width="1982" height="1323" alt="CleanShot 2026-03-09 at 22 03 25" src="https://github.com/user-attachments/assets/61426cb2-fc0d-4bb7-8d88-ef06cae32e2e" />



It also uses [json-render](https://json-render.dev) to let LLMs reliably call your custom React components like this `AlgorithmVisualizer`!

<img width="1339" height="1256" alt="CleanShot 2026-03-09 at 22 28 24" src="https://github.com/user-attachments/assets/34be5779-4eb1-4140-a737-d24b992cb8ea" />

## Structure

- `apps/backend`: FastAPI app managed with `uv`
- `apps/frontend`: Vite + React infinite-canvas UI
- `apps/imageservice`: Express service for SVG/PNG image rendering

## Backend

Install dependencies:

```bash
cd apps/backend
uv sync
```

Set environment variables before running:

```bash
export ANTHROPIC_API_KEY=your_key_here
export ANTHROPIC_MODEL=claude-sonnet-4-5
export ANTHROPIC_MODEL_OPTIONS=claude-sonnet-4-5,claude-opus-4-1
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

## Image Service

Install dependencies:

```bash
cd apps/imageservice
npm install
```

Run the service:

```bash
cd apps/imageservice
npm start
```

The image service listens on `http://127.0.0.1:3001`.

## Features

### Canvas & Chat
- Pannable and zoomable infinite canvas
- Multiple draggable chat windows
- Streaming model responses
- Per-window model picker with backend-driven model options
- Model badge on assistant responses
- Phrase-level branching from any completed user or assistant message
- Recursive child chats with inherited parent history snapshots
- Connector lines from the anchored phrase to the child chat window
- Cascade-close confirmation when a parent has descendants
- Starter questions for new chats
- Code syntax highlighting in messages

### JSON-Render Interactive Components
- LLM-driven interactive React components rendered inline in chat via [json-render](https://json-render.dev)
- Inline iframe visualizations generated from assistant `iframe` fences for custom HTML/SVG/JS demos
- Cards, charts, tables, tabs, alerts, progress bars, and more
- AlgorithmStepper: step-through algorithm walkthroughs
- AlgorithmVisualizer: synchronized code + graph visualization with step highlighting
- Diagram component for trees, graphs, and state machines (nodes/edges)

### Image Rendering
- Image rendering service for static SVG/PNG generation

## Quick Start

1. Start the backend.
2. Start the frontend.
3. Open `http://127.0.0.1:5173`.
4. Send a message in `Chat 1`.
5. Highlight a phrase in any completed message and click `Branch`.
