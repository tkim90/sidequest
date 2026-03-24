# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API dependencies, setup quirks, and platform notes.  
**What does NOT belong here:** Service commands or port orchestration details (use `.factory/services.yaml`).

---

- `apps/frontend` is the only app touched by this mission.
- The frontend expects an existing chat backend at `http://127.0.0.1:8000` via the Vite `/api` proxy.
- Browser validation uses the already-installed local `agent-browser` Chromium runtime.
- Build on top of the current local chat UI changes rather than resetting the working tree.
