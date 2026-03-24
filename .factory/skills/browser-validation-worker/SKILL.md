---
name: browser-validation-worker
description: Execute mission browser validation directly with agent-browser, write validation artifacts, and update validation-state.json when built-in user-testing validation is unreliable.
---

# Browser Validation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the direct browser-validation procedure for mission features that own assertion execution.

## When to Use This Skill

Use this skill for features that:

- validate assertions from `validation-contract.md` on the live browser surface
- collect required screenshot, console, network, or browser-state evidence
- write `.factory/validation/<milestone>/user-testing/` artifacts
- update mission `validation-state.json` directly

## Required Skills

- `agent-browser` — Required. Use it to execute the assigned browser flows on `http://127.0.0.1:5174`. Do not stop at a plan or readiness note.

## Work Procedure

1. Read the mission and runtime context before doing any browser work:
   - `mission.md`
   - mission `AGENTS.md`
   - `validation-contract.md`
   - `validation-state.json`
   - `features.json`
   - `.factory/services.yaml`
   - `.factory/library/user-testing.md`
2. Determine exactly which assertions the assigned feature owns through its `fulfills` list and review each assertion's required evidence.
3. Start or verify the required services from `.factory/services.yaml`:
   - confirm `chat_api` health on `http://127.0.0.1:8000`
   - confirm `web` health on `http://127.0.0.1:5174`
4. Execute the validation flows directly with `agent-browser`:
   - perform real user interactions for each assigned assertion
   - capture the evidence required by the contract
   - keep flows isolated and use uniquely identifiable selections where the contract calls for them
   - if a flow fails, gather enough evidence to explain whether it is a product regression, setup problem, or flaky surface
5. Write validation artifacts before handoff:
   - create per-flow or per-assertion JSON reports under `.factory/validation/<milestone>/user-testing/flows/`
   - write `.factory/validation/<milestone>/user-testing/synthesis.json` summarizing pass/fail/blocked outcomes and evidence pointers
   - update mission `validation-state.json` so every owned assertion is marked `passed`, `failed`, or `blocked`
6. Before returning:
   - stop any services this worker started if the manifest says to stop them
   - ensure the browser-validation artifacts and `validation-state.json` agree
   - call `EndFeatureRun`; never exit after a narrative status message

## Handoff Requirements

- List every validated assertion ID and its result
- Include the artifact paths written under `.factory/validation/<milestone>/user-testing/`
- State whether `validation-state.json` was updated successfully
- Call out any blocked assertions with the exact reason and evidence

## When to Return to Orchestrator

- A required service on `127.0.0.1:8000` or `127.0.0.1:5174` cannot be restored
- The app behavior is ambiguous and the contract does not resolve the expected outcome
- An assertion cannot be executed because the product surface is missing or broken in a way that needs implementation work
- You cannot write the required validation artifacts or update `validation-state.json`
