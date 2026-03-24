# User Testing

Validation surface findings, tooling choices, and runtime testing guidance.

**What belongs here:** Real user surfaces, required testing tools, setup notes, assertion-specific gotchas, and resource cost classification.  
**What does NOT belong here:** Implementation plans or service command definitions.

---

## Validation Surface

- Surface: browser
- Tool: `agent-browser`
- Entry URL: `http://127.0.0.1:5174`
- The frontend depends on the existing backend at `http://127.0.0.1:8000` through Vite proxying.
- Verified in dry run:
  - app loads successfully on `5174`
  - screenshots can be captured
  - `Add new note` opens a floating note successfully
  - starter-question send flow can render a root conversation successfully

## Flow Notes

- Hover/focus is required to reveal some message affordances such as model badges and `Retry`.
- Branch validation should use uniquely identifiable, non-overlapping text selections to avoid ambiguous anchor mapping.
- Split-pane persistence should be checked with both visual evidence and the `sidequest:left-pane-width` localStorage key.
- Evidence for model/effort assertions should include request-body inspection, not just response status.

## Validation Concurrency

- Surface: browser
- Max concurrent validators: `5`
- Machine profile used for planning: 14 CPU cores, 48 GB RAM
- Dry run observations: lightweight Vite frontend, no meaningful resource pressure during load/open-note/send checks, and no unexpected process growth
- Rationale: this surface is light enough for the maximum allowed validator concurrency while leaving substantial headroom

## Flow Validator Guidance: browser

- Use `agent-browser` against `http://127.0.0.1:5174`.
- Flow validators on this surface are execution-only; do not stop at a plan or spec response.
- If a flow-validator task does not execute and does not write its JSON report, the parent `user-testing-validator` must run the assigned browser checks directly and record the missing report as friction or blocking evidence.
- Keep validators on unique, non-overlapping interactions and avoid mutating shared global configuration.

## Mission Workaround Note

- In mission `503639ee-5760-42ca-adb6-28b035f9af66`, the built-in `user-testing-validator` repeatedly exited after context setup without executing browser flows.
- Browser assertion execution for that mission is therefore owned by a custom `browser-validation-worker` feature that runs `agent-browser` directly, writes `.factory/validation/<milestone>/user-testing/` artifacts, and updates the mission `validation-state.json`.
