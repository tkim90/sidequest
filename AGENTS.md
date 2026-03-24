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

## React `useEffect` Guidelines
At our organization, we have strictly banned the direct use of `useEffect`. Most `useEffect` usage compensates for things React already handles better with other primitives: derived state, event handlers, and data-fetching abstractions. Banning the hook forces logic to be declarative and predictable, preventing race conditions, infinite loops, and brittle dependency arrays.

Follow these 5 core patterns to replace `useEffect`:

### 1. Derive State, Do Not Sync It
Compute derived values inline during the render cycle instead of using an effect to sync state.
*   **Smell Test:** You are writing `useEffect(() => setX(deriveFromY(y)), [y])`
*   **❌ Bad:** Using two render cycles (first stale, then filtered) by updating a secondary state in an effect.
*   **✅ Good:** Compute the value directly in the component body (`const filtered = items.filter(...)`).

### 2. Use Data-Fetching Libraries
Never use effects for data fetching. Effect-based fetching often creates race conditions, duplicated caching logic, and lacks cancellation.
*   **Smell Test:** Your effect does `fetch(...)` and then `setState(...)`.
*   **❌ Bad:** Fetching data in `useEffect` and manually setting loading/data states.
*   **✅ Good:** Use robust query libraries (like React Query, SWR) that handle cancellation, caching, and staleness automatically.

### 3. Use Event Handlers, Not Effects
If an action is triggered by a user (e.g., a click), the logic belongs in the event handler, not an effect.
*   **Smell Test:** State is used merely as a flag so an effect can trigger the real action (the "set flag -> effect runs -> reset flag" anti-pattern).
*   **❌ Bad:** Setting `isSubmitting` to true in `onClick`, then having a `useEffect` listen to `isSubmitting` to make the API call.
*   **✅ Good:** Make the API call directly inside the `onClick` handler.

### 4. Use `useMountEffect` for One-Time External Sync
For the rare cases where you genuinely need to sync with an external system on mount, use a custom `useMountEffect` hook.
*   **Definition:** `export function useMountEffect(effect) { useEffect(effect, []); }`
*   **Good Uses:** DOM integration (focus, scroll), 3rd-party widget lifecycles, browser API subscriptions.
*   **Smell Test:** You are synchronizing with an external system and the behavior is naturally "setup on mount, cleanup on unmount".
*   **Pattern:** Instead of putting `if (!isLoading)` guards inside an effect, use **conditional mounting**. Only render the component containing the `useMountEffect` when preconditions are met.

### 5. Reset with `key`, Not Dependency Choreography
Do not use effects to clear out or reset state when a prop (like an ID) changes.
*   **Smell Test:** You are writing an effect whose only job is to reset local state when an ID/prop changes.
*   **❌ Bad:** `useEffect(() => { resetState(); loadData(id); }, [id])`
*   **✅ Good:** Pass the ID as a `key` prop to the component (`<Component key={id} id={id} />`). This forces React to unmount the old instance and cleanly remount a brand-new instance, naturally resetting all state.

- Smells to reject here: `useEffect(() => setX(deriveFromY(y)), [y])`, `fetch(...).then(setState)` inside an effect, “set flag -> effect runs -> reset flag”, effects whose only job is to reset local state on ID/prop change, and chains of effects used as control flow.

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