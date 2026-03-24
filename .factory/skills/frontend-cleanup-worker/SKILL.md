---
name: frontend-cleanup-worker
description: Refactor the React chat UI into smaller composable, testable components while preserving behavior and visual design.
---

# Frontend Cleanup Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the work procedure for React cleanup features in `apps/frontend`.

## When to Use This Skill

Use this skill for features that:

- Refactor chat UI containers and presentational components
- Introduce or adopt shared button primitives
- Extract leaf components or icons from large JSX-heavy files
- Preserve user-visible chat behavior while improving structure and testability

## Required Skills

- `agent-browser` — Required for any feature that changes a user-visible browser surface. Use it after implementation to validate the specific flows touched by the feature on `http://127.0.0.1:5174`.

## Work Procedure

1. Read the mission artifacts before editing:
   - `mission.md`
   - mission `AGENTS.md`
   - `.factory/library/architecture.md`
   - `.factory/library/chat-ui.md`
   - `.factory/library/user-testing.md`
2. Identify the clean boundary before touching code:
   - decide which file/hook stays the container
   - decide which new or existing components become pure presentation leaves
   - keep orchestration, state ownership, and side effects out of presentational components
3. Write or update focused tests first so they fail against the intended refactor slice. Prefer isolated Vitest coverage around extracted helpers/components and behavior-focused regression tests for touched UI.
4. Implement the refactor:
   - preserve the current notebook/paper styling
   - move raw SVG into dedicated icon/mark components
   - replace touched raw button surfaces with the shared button primitive when the feature scope calls for it
   - delete duplicated or incidental code when a cleaner boundary makes it unnecessary
   - do not add new direct `useEffect` usage unless the touched code truly needs mount-scoped external synchronization
5. Run targeted verification while iterating:
   - feature-scoped Vitest tests
   - `npm --prefix apps/frontend run typecheck`
6. Manually verify the touched browser flows with `agent-browser`:
   - start the `web` service on port `5174` if it is not already running
   - validate only the feature’s affected flows
   - collect concrete observations, not generic “looks good” statements
7. Before handoff, run every verification step listed on the feature plus any additional targeted checks needed to prove the change.
8. In the handoff, be explicit about:
   - which container/component boundaries changed
   - which tests were added first
   - which browser flows were manually checked
   - any behavior intentionally left unchanged but still risky

## Example Handoff

```json
{
  "salientSummary": "Split ChatCanvas into shell presentation leaves plus a slimmer container-facing component, migrated Add new note and Close note to the shared Button primitive, and preserved floating-note open/close behavior. Added focused shell tests, ran typecheck, and verified root/floating note flows in the browser on port 5174.",
  "whatWasImplemented": "Extracted notebook gutter, canvas header actions, and floating-note stack presentation out of ChatCanvas while keeping workspace orchestration in the existing container path. Added shared Button usage for shell controls, preserved root-only GitHub branding, and updated targeted Vitest coverage around shell rendering and note lifecycle behavior.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "npm --prefix apps/frontend run test -- ChatCanvas.test.tsx GithubLogo.test.tsx --maxWorkers=7",
        "exitCode": 0,
        "observation": "Focused shell tests passed after the refactor."
      },
      {
        "command": "npm --prefix apps/frontend run typecheck",
        "exitCode": 0,
        "observation": "TypeScript stayed clean after the component extraction."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened http://127.0.0.1:5174, confirmed the fixed Sidequest pane still rendered root branding and Add new note.",
        "observed": "Root shell matched the pre-refactor layout and still showed the GitHub badge only in the root canvas header."
      },
      {
        "action": "Clicked Add new note, then closed the new floating note.",
        "observed": "A numbered Chat note opened inside the canvas and closed independently without disturbing the fixed root pane."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "apps/frontend/src/chat/components/ChatCanvas.test.tsx",
        "cases": [
          {
            "name": "renders the fixed notebook shell without floating-note chrome",
            "verifies": "Root shell structure and branding remain correct after extraction."
          },
          {
            "name": "renders the GitHub link badge only for the root title",
            "verifies": "Root-only branding stays intact."
          }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- The feature cannot be completed without changing mission boundaries or touching off-limits services/ports
- The refactor reveals ambiguous product behavior that tests and current UI do not resolve
- The existing backend at `127.0.0.1:8000` is unavailable and blocks required browser verification
- The feature needs a broader architectural decision than the current container/component split guidance provides
