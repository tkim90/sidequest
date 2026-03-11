# Sidequest Performance Patterns

## Streaming Architecture
- SSE tokens arrive via `onDelta` callback in `useChatWorkspace.ts`
- Delta batching (`useDeltaBatcher.ts`): buffers tokens and flushes every ~80ms (`BATCH_INTERVAL_MS`)
- Each flush calls `appendAssistantDelta` (state update) + `requestGeometryRefresh` (increments `geometryVersion`)

## Memoization Strategy
- `ChatWindow` is wrapped in `React.memo` with custom comparator (`areChatWindowPropsEqual`) that excludes callback props
- `ConnectionLayer` is wrapped in `React.memo` (shallow comparison)
- `ChatMessageCard` is memoized with custom comparator
- `useConnectorPaths` depends on `geometryVersion`, NOT `messagesByWindowId` — this prevents per-token forced layout

## Performance Hotspots to Watch
1. `appendAssistantDelta` in `workspaceActions.ts` — O(n) per token where n = messages in window
2. `useConnectorPaths` — calls `getBoundingClientRect` on every anchor/window per geometry version change
3. `useChatWindowLayout` — reads/writes scroll metrics on every message change, calls `onGeometryChange`
4. `IncrementalTokenText` in `BlockRenderers.tsx` — accumulates spans per token during streaming
