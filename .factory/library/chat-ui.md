# Chat UI Cleanup Scope

Mission-specific scope notes for the React cleanup.

**What belongs here:** Targeted files, known cleanup hotspots, and behavior that must survive refactor.  
**What does NOT belong here:** Validator orchestration or service commands.

---

## Primary Cleanup Targets

- `apps/frontend/src/chat/components/ChatCanvas.tsx`
- `apps/frontend/src/chat/components/ChatWindow.tsx`
- `apps/frontend/src/chat/components/ChatWindowComposer.tsx`
- `apps/frontend/src/chat/components/ChatWindowHeader.tsx`
- `apps/frontend/src/chat/components/ChatWindowMessages.tsx`
- `apps/frontend/src/chat/components/SelectionPopover.tsx`
- `apps/frontend/src/chat/hooks/useChatWorkspace.ts`
- `apps/frontend/src/chat/hooks/useBranchSelection.ts`

## Mission Priorities

- Keep the current GitHub mark/logo extraction pattern and continue isolating raw SVG into dedicated leaf components.
- Move repeated button-like surfaces toward the shared shadcn-based `Button` primitive while preserving the current notebook styling.
- Treat large JSX-heavy files as smells; extract pure presentational leaves and let containers compose them.
- Preserve drag/resize, branch creation, source navigation, inherited history, and close-tree behavior while simplifying the structure behind those flows.
- If tests disagree with current live behavior, prefer the current intended product behavior and update stale tests accordingly.
