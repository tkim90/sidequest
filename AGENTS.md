# Repository Guidelines

## Render Purity
- Render must be pure and idempotent: the same props, state, and context should produce the same JSX.
- Do not mutate props, state, context, or preexisting objects during render.
- Do not perform side effects during render; render computes UI only.
- Derive state, do not sync it: if a value can be computed from existing props or state, compute it during render instead of updating mirrored state later.

## State and Data Flow
- Keep state minimal; do not store redundant, mirrored, or derivable state.
- Each piece of state must have one owner and one source of truth.
- Lift state up when multiple components need to stay in sync.
- Prefer explicit props and controlled components for shared behavior over implicit cross-component coupling.
- Props are read-only snapshots; never mutate them.
- If the desired behavior is “start fresh for a new entity,” reset with `key` and remount semantics instead of dependency choreography.

## Effects and External Systems
- For new and touched frontend code, do not call `useEffect` directly in application code.
- For rare mount-time external synchronization, use a shared `useMountEffect` helper instead.
- `useMountEffect` is only for setup-on-mount / cleanup-on-unmount external sync.
- Allowed `useMountEffect` cases: DOM integration, focus/scroll setup, third-party widget lifecycle, browser API subscriptions, and other mount-scoped external setup.
- Put user-event logic in event handlers, not in effects.
- Use data-fetching libraries or higher-level data abstractions instead of effect-driven `fetch(...).then(setState)` logic.
- Prefer conditional mounting over guards inside effects when behavior should begin only after preconditions are satisfied.
- Smells to reject here: `useEffect(() => setX(deriveFromY(y)), [y])`, `fetch(...).then(setState)` inside an effect, “set flag -> effect runs -> reset flag”, effects whose only job is to reset local state on ID/prop change, and chains of effects used as control flow.
- Adoption note: this is a hard rule for new and touched code; existing direct `useEffect` call sites may be migrated opportunistically, and future lint enforcement is desirable but not part of this AGENTS-only change.

## Component Boundaries and Composition
- Keep components small, named, single-purpose, and composable through props.
- Container and orchestration components should assemble leaf components instead of carrying long inline JSX trees.
- Raw `<svg>` markup belongs in dedicated icon or mark components such as `*Icon` or `*MarkIcon`.
- Prefer composition and props over monolithic components that mix layout, state, effects, and presentation.
- Parents should own orchestration and lifecycle boundaries; children should assume preconditions are already satisfied.
- Keep feature-local UI in the nearest `components/` directory until it is reused broadly enough to justify promotion.
- Treat files like `ChatCanvas.tsx` with long inline `div` trees, embedded SVG, mixed types, effects, and presentation as a smell that should trigger extraction.

## Performance and Memoization
- Do not add `useMemo` or `useCallback` by default.
- Add manual memoization only for profiled expensive calculations, memoized child boundaries, or APIs that require stable identities.
- Never use memoization hooks to patch over bad state shape, effect misuse, or unclear ownership.
- Do not use `useMemo` or `useCallback` to stabilize bad effect-driven architecture.
- In this repo, manual memoization is a last-mile optimization, not a design primitive.

## Testability and Smell Checks
- Components should be easy to render in isolation with props.
- Prefer pure helpers for derived logic that can be tested without mounting large UI trees.
- When extracting or reshaping UI, add focused Vitest coverage around observable behavior and preserve existing behavior.
- If a component becomes easier to understand by extracting a mount boundary or handler boundary, do that instead of adding an effect.
- Files like `ChatCanvas.tsx` with long inline trees plus orchestration logic are still a smell, and effect-driven fixes should not be used to avoid extraction.
- Smells to fix early: derived state updated in effects, chains of effects updating other state, child-to-parent synchronization through effects, giant component files mixing layout/types/effects/presentation, large inline SVG or repeated markup in container components, and too many boolean props or unclear ownership.
