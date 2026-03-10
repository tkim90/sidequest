# Sidequest Local Dev Setup & Testing

## Architecture
- **Frontend**: React + Vite at `apps/frontend/` (port 5173)
- **Backend**: FastAPI at `apps/backend/` (port 8000)
- Vite proxy: `/api` routes proxy to `http://127.0.0.1:8000`

## Backend Setup
```bash
cd apps/backend
export OPENAI_API_KEY="$OPENAI_API_KEY"
export OPENAI_MODEL="gpt-4o-mini"
export OPENAI_MODEL_OPTIONS="gpt-4o-mini"
uv run uvicorn app.main:app --reload
```
Requires `OPENAI_API_KEY` secret with `model.request` scope.

## Frontend Setup
```bash
cd apps/frontend
npm install
npm run dev
```
App available at http://localhost:5173

## Lint & Typecheck
```bash
cd apps/frontend
npm run typecheck
npm run lint
```

## Tests
```bash
cd apps/frontend
npm test
```

## Key Interactions
- **Streaming chat**: Type in textarea (placeholder "Ask a follow-up..."), press Enter. Tokens stream via SSE.
- **Branching**: Select text in an assistant message by click-dragging (NOT programmatic JS — requires real mouse drag for React's synthetic `onMouseDown` on `[data-message-card]`). A popover appears to create a branch/child window.
- **Connector lines**: SVG lines connect parent anchors to child windows. Positioned via `getBoundingClientRect` in `useConnectorPaths`.

## Browser Automation Limitations
- Text selection for branching requires real mouse click-drag. Browser automation tools that only support `click` (not drag) cannot trigger the branch popover because:
  1. `handleMessageMouseDown` (React event) sets `mouseDownRef` on mousedown
  2. Document-level `mouseup` listener reads `mouseDownRef` + checks `window.getSelection()`
  3. A regular click triggers both mousedown and mouseup instantly, clearing the ref before any selection exists
- Shift+click does NOT work either because the first click's mouseup already clears `mouseDownRef`
